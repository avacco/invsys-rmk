package com.invsys.inventory.domain;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockLevelRepository extends JpaRepository<StockLevel, StockLevelId> {

    /** Crea el saldo en cero si todavía no existe (seguro ante inserciones concurrentes). */
    @Modifying
    @Query(value = """
            INSERT INTO stock_levels (product_id, warehouse_id, quantity, updated_at)
            VALUES (:productId, :warehouseId, 0, now())
            ON CONFLICT (product_id, warehouse_id) DO NOTHING
            """, nativeQuery = true)
    void ensureExists(@Param("productId") Long productId, @Param("warehouseId") Long warehouseId);

    /** Lee el saldo bloqueando la fila (SELECT ... FOR UPDATE) hasta el fin de la transacción. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from StockLevel s where s.id = :id")
    Optional<StockLevel> findForUpdate(@Param("id") StockLevelId id);

    @Query("select s from StockLevel s join fetch s.warehouse where s.id.productId in :productIds")
    List<StockLevel> findByProductIds(@Param("productIds") Collection<Long> productIds);

    @Query("select sum(s.quantity) from StockLevel s where s.id.productId = :productId")
    /** Suma de los saldos del producto en todos los almacenes; null si nunca tuvo stock. */
    java.math.BigDecimal totalForProduct(@Param("productId") Long productId);
}
