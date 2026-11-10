package com.invsys.catalog.app;

import com.invsys.catalog.domain.ProductRepository;
import com.invsys.partners.app.SupplierUsage;
import org.springframework.stereotype.Component;

@Component
class ProductSupplierUsage implements SupplierUsage {

    private final ProductRepository products;

    ProductSupplierUsage(ProductRepository products) {
        this.products = products;
    }

    @Override
    public boolean isInUse(Long supplierId) {
        return products.existsBySupplierId(supplierId);
    }
}
