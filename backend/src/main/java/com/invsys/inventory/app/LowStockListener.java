package com.invsys.inventory.app;

import com.invsys.catalog.domain.ProductRepository;
import com.invsys.inventory.domain.StockLevelRepository;
import java.math.BigDecimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Detecta cuando una salida deja un producto por debajo de su stock mínimo.
 * Hoy solo lo registra en el log; es el punto donde enchufar notificaciones (email, Slack...).
 */
@Component
class LowStockListener {

    private static final Logger log = LoggerFactory.getLogger(LowStockListener.class);

    private final ProductRepository products;
    private final StockLevelRepository levels;

    LowStockListener(ProductRepository products, StockLevelRepository levels) {
        this.products = products;
        this.levels = levels;
    }

    @TransactionalEventListener
    void onStockMoved(StockMovedEvent event) {
        if (event.delta().signum() >= 0) {
            return;
        }
        products.findById(event.productId()).ifPresent(product -> {
            BigDecimal total = levels.totalForProduct(product.getId());
            if (total == null) {
                total = BigDecimal.ZERO;
            }
            if (product.getMinStock().signum() > 0 && total.compareTo(product.getMinStock()) < 0) {
                log.warn("Stock bajo: {} ({}) tiene {} y el mínimo es {}",
                        product.getName(), product.getSku(), total.toPlainString(), product.getMinStock().toPlainString());
            }
        });
    }
}
