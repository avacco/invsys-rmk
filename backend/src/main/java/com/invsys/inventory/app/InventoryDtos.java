package com.invsys.inventory.app;

import com.invsys.inventory.domain.MovementType;
import com.invsys.inventory.domain.StockMovement;
import com.invsys.inventory.domain.Warehouse;
import com.invsys.shared.persistence.AuditInfo;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class InventoryDtos {

    private InventoryDtos() {}

    // --- Almacenes ---

    public record WarehouseRequest(
            @NotBlank @Size(max = 32) @Pattern(regexp = "^[A-Za-z0-9_-]+$",
                    message = "solo letras, números, guion y guion bajo") String code,
            @NotBlank @Size(max = 100) String name,
            @Size(max = 255) String address,
            Boolean active) {}

    public record WarehouseResponse(Long id, String code, String name, String address, boolean active, AuditInfo audit) {
        public static WarehouseResponse of(Warehouse w) {
            return new WarehouseResponse(w.getId(), w.getCode(), w.getName(), w.getAddress(), w.isActive(), AuditInfo.of(w));
        }
    }

    public record WarehouseRef(Long id, String code, String name) {
        public static WarehouseRef of(Warehouse w) {
            return new WarehouseRef(w.getId(), w.getCode(), w.getName());
        }
    }

    // --- Movimientos ---

    /** Operación que pide el usuario. TRANSFER genera dos movimientos (salida y entrada). */
    public enum MovementKind { IN, OUT, ADJUSTMENT, TRANSFER }

    /**
     * quantity: cantidad que entra, sale o se transfiere (mayor que 0).
     * En ADJUSTMENT es el saldo contado (el sistema calcula la diferencia).
     */
    public record MovementRequest(
            @NotNull MovementKind type,
            @NotNull Long productId,
            @NotNull Long warehouseId,
            Long targetWarehouseId,
            @NotNull @DecimalMin("0") @Digits(integer = 11, fraction = 3) BigDecimal quantity,
            @Size(max = 255) String reason,
            @Size(max = 100) String reference) {}

    public record ProductRef(Long id, String sku, String name, String unitCode, int unitDecimals) {}

    public record MovementResponse(
            Long id, MovementType type, ProductRef product, WarehouseRef warehouse,
            BigDecimal quantity, BigDecimal balanceAfter, String reason, String reference,
            UUID transferGroup, Instant createdAt, String createdBy) {

        public static MovementResponse of(StockMovement m) {
            var p = m.getProduct();
            return new MovementResponse(m.getId(), m.getType(),
                    new ProductRef(p.getId(), p.getSku(), p.getName(), p.getUnit().getCode(), p.getUnit().getDecimals()),
                    WarehouseRef.of(m.getWarehouse()), m.getQuantity(), m.getBalanceAfter(),
                    m.getReason(), m.getReference(), m.getTransferGroup(), m.getCreatedAt(), m.getCreatedBy());
        }
    }

    public record MovementFilter(Long productId, Long warehouseId, MovementType type) {}

    // --- Stock ---

    public record WarehouseStock(WarehouseRef warehouse, BigDecimal quantity) {}

    public record ProductStockResponse(ProductRef product, BigDecimal minStock, BigDecimal total,
                                       boolean low, List<WarehouseStock> levels) {}

    public record StockFilter(String q, Long categoryId, boolean lowOnly) {}

    public record InventorySummary(BigDecimal inventoryValue, long lowStockProducts,
                                   long movementsLast7Days, long activeWarehouses) {}
}
