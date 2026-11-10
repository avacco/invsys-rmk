package com.invsys.inventory.app;

import com.invsys.catalog.app.ProductUsage;
import com.invsys.inventory.domain.StockMovementRepository;
import org.springframework.stereotype.Component;

@Component
class InventoryProductUsage implements ProductUsage {

    private final StockMovementRepository movements;

    InventoryProductUsage(StockMovementRepository movements) {
        this.movements = movements;
    }

    @Override
    public boolean isInUse(Long productId) {
        return movements.existsByProductId(productId);
    }
}
