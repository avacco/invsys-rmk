package com.invsys.inventory.app;

import com.invsys.catalog.domain.Product;
import com.invsys.catalog.domain.ProductRepository;
import com.invsys.catalog.domain.Unit;
import com.invsys.inventory.app.InventoryDtos.MovementRequest;
import com.invsys.inventory.app.InventoryDtos.MovementResponse;
import com.invsys.inventory.domain.MovementType;
import com.invsys.inventory.domain.StockLevel;
import com.invsys.inventory.domain.StockLevelId;
import com.invsys.inventory.domain.StockLevelRepository;
import com.invsys.inventory.domain.StockMovement;
import com.invsys.inventory.domain.StockMovementRepository;
import com.invsys.inventory.domain.Warehouse;
import com.invsys.inventory.domain.WarehouseRepository;
import com.invsys.shared.web.BadRequestException;
import com.invsys.shared.web.ConflictException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Único punto que modifica el stock (ADR 0003). Cada operación bloquea las filas de saldo
 * involucradas (SELECT ... FOR UPDATE), así dos salidas simultáneas no pueden dejar el saldo negativo.
 */
@Service
public class InventoryService {

    private final ProductRepository products;
    private final WarehouseRepository warehouses;
    private final StockLevelRepository levels;
    private final StockMovementRepository movements;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public InventoryService(ProductRepository products, WarehouseRepository warehouses, StockLevelRepository levels,
                            StockMovementRepository movements, ApplicationEventPublisher events, Clock clock) {
        this.products = products;
        this.warehouses = warehouses;
        this.levels = levels;
        this.movements = movements;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public List<MovementResponse> register(MovementRequest r) {
        Product product = products.findById(r.productId())
                .orElseThrow(() -> new BadRequestException("El producto " + r.productId() + " no existe"));
        Warehouse source = activeWarehouse(r.warehouseId());
        BigDecimal quantity = normalize(r.quantity(), product.getUnit());
        String reason = clean(r.reason());
        String reference = clean(r.reference());
        Instant now = clock.instant();

        return switch (r.type()) {
            case IN -> {
                requirePositive(quantity);
                yield List.of(apply(lock(product, source), MovementType.IN, product, source, quantity, reason, reference, null, now));
            }
            case OUT -> {
                requirePositive(quantity);
                yield List.of(apply(lock(product, source), MovementType.OUT, product, source, quantity.negate(), reason, reference, null, now));
            }
            case ADJUSTMENT -> {
                if (reason == null) {
                    throw new BadRequestException("Indicá el motivo del ajuste");
                }
                StockLevel level = lock(product, source);
                BigDecimal delta = quantity.subtract(level.getQuantity());
                if (delta.signum() == 0) {
                    throw new BadRequestException("El saldo contado coincide con el registrado; no hay nada que ajustar");
                }
                yield List.of(apply(level, MovementType.ADJUSTMENT, product, source, delta, reason, reference, null, now));
            }
            case TRANSFER -> {
                requirePositive(quantity);
                if (r.targetWarehouseId() == null) {
                    throw new BadRequestException("Indicá el almacén de destino");
                }
                if (r.targetWarehouseId().equals(source.getId())) {
                    throw new BadRequestException("El almacén de destino debe ser distinto del de origen");
                }
                Warehouse target = activeWarehouse(r.targetWarehouseId());
                // Bloqueo en orden de id para que dos transferencias cruzadas no se bloqueen mutuamente.
                StockLevel sourceLevel;
                StockLevel targetLevel;
                if (source.getId() < target.getId()) {
                    sourceLevel = lock(product, source);
                    targetLevel = lock(product, target);
                } else {
                    targetLevel = lock(product, target);
                    sourceLevel = lock(product, source);
                }
                UUID group = UUID.randomUUID();
                yield List.of(
                        apply(sourceLevel, MovementType.TRANSFER_OUT, product, source, quantity.negate(), reason, reference, group, now),
                        apply(targetLevel, MovementType.TRANSFER_IN, product, target, quantity, reason, reference, group, now));
            }
        };
    }

    private StockLevel lock(Product product, Warehouse warehouse) {
        levels.ensureExists(product.getId(), warehouse.getId());
        return levels.findForUpdate(new StockLevelId(product.getId(), warehouse.getId())).orElseThrow();
    }

    private MovementResponse apply(StockLevel level, MovementType type, Product product, Warehouse warehouse,
                                   BigDecimal delta, String reason, String reference, UUID group, Instant now) {
        if (level.getQuantity().add(delta).signum() < 0) {
            throw new ConflictException("Stock insuficiente en %s: disponible %s %s".formatted(
                    warehouse.getName(), level.getQuantity().stripTrailingZeros().toPlainString(), product.getUnit().getCode()));
        }
        level.apply(delta, now);
        StockMovement movement = movements.save(new StockMovement(
                type, product, warehouse, delta, level.getQuantity(), reason, reference, group));
        events.publishEvent(new StockMovedEvent(movement.getId(), product.getId(), warehouse.getId(), delta, level.getQuantity()));
        return MovementResponse.of(movement);
    }

    private Warehouse activeWarehouse(Long id) {
        Warehouse warehouse = warehouses.findById(id)
                .orElseThrow(() -> new BadRequestException("El almacén " + id + " no existe"));
        if (!warehouse.isActive()) {
            throw new BadRequestException("El almacén " + warehouse.getName() + " está inactivo");
        }
        return warehouse;
    }

    /** Valida que la cantidad respete los decimales de la unidad (no se venden 1,5 martillos). */
    private static BigDecimal normalize(BigDecimal quantity, Unit unit) {
        BigDecimal stripped = quantity.stripTrailingZeros();
        if (stripped.scale() > unit.getDecimals()) {
            throw new BadRequestException(unit.getDecimals() == 0
                    ? "La unidad %s no admite decimales".formatted(unit.getName())
                    : "La unidad %s admite hasta %d decimales".formatted(unit.getName(), unit.getDecimals()));
        }
        return quantity.setScale(3, RoundingMode.UNNECESSARY);
    }

    private static void requirePositive(BigDecimal quantity) {
        if (quantity.signum() <= 0) {
            throw new BadRequestException("La cantidad debe ser mayor que cero");
        }
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
