package com.invsys.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class StockLevelId implements Serializable {

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "warehouse_id")
    private Long warehouseId;

    protected StockLevelId() {}

    public StockLevelId(Long productId, Long warehouseId) {
        this.productId = productId;
        this.warehouseId = warehouseId;
    }

    public Long getProductId() { return productId; }
    public Long getWarehouseId() { return warehouseId; }

    @Override
    public boolean equals(Object o) {
        return o instanceof StockLevelId other
                && Objects.equals(productId, other.productId)
                && Objects.equals(warehouseId, other.warehouseId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(productId, warehouseId);
    }
}
