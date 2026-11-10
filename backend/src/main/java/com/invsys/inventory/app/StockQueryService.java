package com.invsys.inventory.app;

import com.invsys.catalog.domain.Product;
import com.invsys.catalog.domain.ProductRepository;
import com.invsys.catalog.domain.ProductStatus;
import com.invsys.inventory.app.InventoryDtos.InventorySummary;
import com.invsys.inventory.app.InventoryDtos.MovementFilter;
import com.invsys.inventory.app.InventoryDtos.MovementResponse;
import com.invsys.inventory.app.InventoryDtos.ProductRef;
import com.invsys.inventory.app.InventoryDtos.ProductStockResponse;
import com.invsys.inventory.app.InventoryDtos.StockFilter;
import com.invsys.inventory.app.InventoryDtos.WarehouseRef;
import com.invsys.inventory.app.InventoryDtos.WarehouseStock;
import com.invsys.inventory.domain.StockLevel;
import com.invsys.inventory.domain.StockLevelRepository;
import com.invsys.inventory.domain.StockMovement;
import com.invsys.inventory.domain.StockMovementRepository;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class StockQueryService {

    private final ProductRepository products;
    private final StockLevelRepository levels;
    private final StockMovementRepository movements;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public StockQueryService(ProductRepository products, StockLevelRepository levels, StockMovementRepository movements,
                             JdbcTemplate jdbc, Clock clock) {
        this.products = products;
        this.levels = levels;
        this.movements = movements;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /** Stock de los productos activos, con el detalle por almacén. */
    public Page<ProductStockResponse> stock(StockFilter filter, Pageable pageable) {
        Page<Product> page = products.findAll(stockSpecification(filter), pageable);
        List<Long> ids = page.getContent().stream().map(Product::getId).toList();
        Map<Long, List<StockLevel>> byProduct = ids.isEmpty() ? Map.of()
                : levels.findByProductIds(ids).stream().collect(Collectors.groupingBy(l -> l.getId().getProductId()));
        return page.map(p -> toStock(p, byProduct.getOrDefault(p.getId(), List.of())));
    }

    public Page<MovementResponse> movements(MovementFilter filter, Pageable pageable) {
        Specification<StockMovement> spec = (root, query, cb) -> cb.conjunction();
        if (filter.productId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("product").get("id"), filter.productId()));
        }
        if (filter.warehouseId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("warehouse").get("id"), filter.warehouseId()));
        }
        if (filter.type() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("type"), filter.type()));
        }
        return movements.findAll(spec, pageable).map(MovementResponse::of);
    }

    public InventorySummary summary() {
        BigDecimal value = jdbc.queryForObject("""
                SELECT COALESCE(SUM(s.quantity * p.cost_price), 0)
                FROM stock_levels s JOIN products p ON p.id = s.product_id
                """, BigDecimal.class);
        Long low = jdbc.queryForObject("""
                SELECT COUNT(*) FROM products p
                WHERE p.status = 'ACTIVE' AND p.min_stock > 0
                  AND p.min_stock > COALESCE((SELECT SUM(s.quantity) FROM stock_levels s WHERE s.product_id = p.id), 0)
                """, Long.class);
        Long warehouses = jdbc.queryForObject("SELECT COUNT(*) FROM warehouses WHERE active", Long.class);
        long recent = movements.countByCreatedAtAfter(clock.instant().minus(Duration.ofDays(7)));
        return new InventorySummary(value, low == null ? 0 : low, recent, warehouses == null ? 0 : warehouses);
    }

    private static ProductStockResponse toStock(Product p, List<StockLevel> productLevels) {
        BigDecimal total = productLevels.stream().map(StockLevel::getQuantity).reduce(BigDecimal.ZERO, BigDecimal::add);
        boolean low = p.getMinStock().signum() > 0 && total.compareTo(p.getMinStock()) < 0;
        List<WarehouseStock> detail = productLevels.stream()
                .sorted(Comparator.comparing(l -> l.getWarehouse().getName()))
                .map(l -> new WarehouseStock(WarehouseRef.of(l.getWarehouse()), l.getQuantity()))
                .toList();
        return new ProductStockResponse(
                new ProductRef(p.getId(), p.getSku(), p.getName(), p.getUnit().getCode(), p.getUnit().getDecimals()),
                p.getMinStock(), total, low, detail);
    }

    private static Specification<Product> stockSpecification(StockFilter f) {
        Specification<Product> spec = (root, query, cb) -> cb.equal(root.get("status"), ProductStatus.ACTIVE);
        if (f.q() != null && !f.q().isBlank()) {
            String like = "%" + f.q().trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("sku")), like)));
        }
        if (f.categoryId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("category").get("id"), f.categoryId()));
        }
        if (f.lowOnly()) {
            spec = spec.and((root, query, cb) -> {
                Subquery<BigDecimal> total = query.subquery(BigDecimal.class);
                Root<StockLevel> level = total.from(StockLevel.class);
                total.select(cb.coalesce(cb.sum(level.<BigDecimal>get("quantity")), BigDecimal.ZERO))
                        .where(cb.equal(level.get("id").get("productId"), root.get("id")));
                return cb.and(
                        cb.greaterThan(root.<BigDecimal>get("minStock"), BigDecimal.ZERO),
                        cb.lessThan(total, root.<BigDecimal>get("minStock")));
            });
        }
        return spec;
    }
}
