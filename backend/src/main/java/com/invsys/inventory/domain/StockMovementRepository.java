package com.invsys.inventory.domain;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long>, JpaSpecificationExecutor<StockMovement> {

    @Override
    @EntityGraph(attributePaths = {"product", "product.unit", "warehouse"})
    Page<StockMovement> findAll(Specification<StockMovement> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"product", "product.unit", "warehouse"})
    Optional<StockMovement> findById(Long id);

    boolean existsByProductId(Long productId);

    boolean existsByWarehouseId(Long warehouseId);

    long countByCreatedAtAfter(Instant since);
}
