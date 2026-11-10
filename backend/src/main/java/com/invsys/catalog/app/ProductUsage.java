package com.invsys.catalog.app;

/**
 * Punto de extensión: otros módulos (inventario, compras, ventas...) indican si un producto
 * tiene historia. Un producto en uso no se borra; se desactiva.
 */
public interface ProductUsage {

    boolean isInUse(Long productId);
}
