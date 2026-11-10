package com.invsys.partners.app;

/**
 * Punto de extensión: otros módulos (catálogo, compras...) indican si un proveedor está en uso.
 * Así partners no depende de esos módulos.
 */
public interface SupplierUsage {

    boolean isInUse(Long supplierId);
}
