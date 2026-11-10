package com.invsys.inventory.app;

import java.math.BigDecimal;

/**
 * Se publica por cada movimiento registrado. Otros módulos (alertas, auditoría, compras...)
 * pueden reaccionar sin que el inventario los conozca.
 */
public record StockMovedEvent(Long movementId, Long productId, Long warehouseId, BigDecimal delta, BigDecimal balanceAfter) {}
