package com.invsys.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

/** Saldo de un producto en un almacén. Solo lo modifica InventoryService al registrar movimientos. */
@Entity
@Table(name = "stock_levels")
public class StockLevel {

    @EmbeddedId
    private StockLevelId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", insertable = false, updatable = false)
    private Warehouse warehouse;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal quantity = BigDecimal.ZERO;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected StockLevel() {}

    public StockLevelId getId() { return id; }
    public Warehouse getWarehouse() { return warehouse; }
    public BigDecimal getQuantity() { return quantity; }

    public void apply(BigDecimal delta, Instant now) {
        BigDecimal result = quantity.add(delta);
        if (result.signum() < 0) {
            throw new IllegalStateException("El saldo no puede quedar negativo");
        }
        this.quantity = result;
        this.updatedAt = now;
    }
}
