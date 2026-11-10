package com.invsys.inventory.app;

import com.invsys.inventory.app.InventoryDtos.ProductRef;
import com.invsys.shared.web.BadRequestException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reportes de inventario. Los valores se calculan con el costo actual de cada producto
 * (no se guarda historial de costos).
 */
@Service
@Transactional(readOnly = true)
public class ReportService {

    public enum ValuationGroup { CATEGORY, WAREHOUSE }

    /** id y name son null para los productos sin categoría. */
    public record ValuationRow(Long id, String name, long products, BigDecimal costValue, BigDecimal saleValue) {}

    public record ActivityDay(LocalDate date, BigDecimal inValue, BigDecimal outValue, BigDecimal adjustmentValue, long movements) {}

    public record TopProduct(ProductRef product, BigDecimal outQuantity, BigDecimal outValue, long movements) {}

    private final JdbcTemplate jdbc;
    private final Clock clock;

    public ReportService(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public List<ValuationRow> valuation(ValuationGroup group) {
        String join = group == ValuationGroup.CATEGORY
                ? "LEFT JOIN categories g ON g.id = p.category_id"
                : "JOIN warehouses g ON g.id = s.warehouse_id";
        return jdbc.query("""
                SELECT g.id AS id, g.name AS name, COUNT(DISTINCT p.id) AS products,
                       SUM(s.quantity * p.cost_price) AS cost_value,
                       SUM(s.quantity * p.sale_price) AS sale_value
                FROM stock_levels s
                JOIN products p ON p.id = s.product_id
                %s
                WHERE s.quantity > 0
                GROUP BY g.id, g.name
                ORDER BY cost_value DESC
                """.formatted(join),
                (rs, i) -> new ValuationRow(rs.getObject("id", Long.class), rs.getString("name"), rs.getLong("products"),
                        rs.getBigDecimal("cost_value"), rs.getBigDecimal("sale_value")));
    }

    /** Valor de entradas, salidas y ajustes por día, en la zona horaria del usuario. Incluye los días sin actividad. */
    public List<ActivityDay> activity(int days, String timeZone) {
        ZoneId zone = zone(timeZone);
        int span = clamp(days, 1, 366);
        LocalDate today = LocalDate.now(clock.withZone(zone));
        LocalDate first = today.minusDays(span - 1L);
        Instant since = first.atStartOfDay(zone).toInstant();

        Map<LocalDate, ActivityDay> byDay = new HashMap<>();
        jdbc.query("""
                SELECT (m.created_at AT TIME ZONE ?)::date AS day,
                       SUM(CASE WHEN m.type = 'IN' THEN m.quantity * p.cost_price ELSE 0 END) AS in_value,
                       SUM(CASE WHEN m.type = 'OUT' THEN -m.quantity * p.cost_price ELSE 0 END) AS out_value,
                       SUM(CASE WHEN m.type = 'ADJUSTMENT' THEN m.quantity * p.cost_price ELSE 0 END) AS adjustment_value,
                       COUNT(*) AS movements
                FROM stock_movements m
                JOIN products p ON p.id = m.product_id
                WHERE m.created_at >= ?
                GROUP BY 1
                """,
                (RowCallbackHandler) rs -> {
                    LocalDate day = rs.getObject("day", LocalDate.class);
                    byDay.put(day, new ActivityDay(day, rs.getBigDecimal("in_value"), rs.getBigDecimal("out_value"),
                            rs.getBigDecimal("adjustment_value"), rs.getLong("movements")));
                },
                zone.getId(), OffsetDateTime.ofInstant(since, ZoneOffset.UTC));

        List<ActivityDay> series = new ArrayList<>(span);
        for (LocalDate d = first; !d.isAfter(today); d = d.plusDays(1)) {
            series.add(byDay.getOrDefault(d, new ActivityDay(d, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0)));
        }
        return series;
    }

    /** Productos con más salidas (valuadas al costo) en el período. */
    public List<TopProduct> topProducts(int days, int limit) {
        Instant since = clock.instant().minusSeconds(86_400L * clamp(days, 1, 366));
        return jdbc.query("""
                SELECT p.id, p.sku, p.name, u.code AS unit_code, u.decimals AS unit_decimals,
                       SUM(-m.quantity) AS out_quantity, SUM(-m.quantity * p.cost_price) AS out_value, COUNT(*) AS movements
                FROM stock_movements m
                JOIN products p ON p.id = m.product_id
                JOIN units u ON u.id = p.unit_id
                WHERE m.type = 'OUT' AND m.created_at >= ?
                GROUP BY p.id, p.sku, p.name, u.code, u.decimals
                ORDER BY out_value DESC, p.name
                LIMIT ?
                """,
                (rs, i) -> new TopProduct(
                        new ProductRef(rs.getLong("id"), rs.getString("sku"), rs.getString("name"),
                                rs.getString("unit_code"), rs.getInt("unit_decimals")),
                        rs.getBigDecimal("out_quantity"), rs.getBigDecimal("out_value"), rs.getLong("movements")),
                OffsetDateTime.ofInstant(since, ZoneOffset.UTC), clamp(limit, 1, 50));
    }

    private static ZoneId zone(String id) {
        if (id == null || id.isBlank()) {
            return ZoneOffset.UTC;
        }
        try {
            return ZoneId.of(id);
        } catch (DateTimeException e) {
            throw new BadRequestException("Zona horaria inválida: " + id);
        }
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
