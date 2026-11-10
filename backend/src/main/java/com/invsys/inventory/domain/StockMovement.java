package com.invsys.inventory.domain;

import com.invsys.catalog.domain.Product;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Movimiento de stock. Es inmutable: una corrección se hace con otro movimiento (ajuste). */
@Entity
@Table(name = "stock_movements")
@EntityListeners(AuditingEntityListener.class)
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private MovementType type;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    /** Cambio con signo: positivo entra, negativo sale. */
    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal quantity;

    @Column(name = "balance_after", nullable = false, precision = 14, scale = 3)
    private BigDecimal balanceAfter;

    private String reason;

    @Column(length = 100)
    private String reference;

    @Column(name = "transfer_group")
    private UUID transferGroup;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private String createdBy;

    protected StockMovement() {}

    public StockMovement(MovementType type, Product product, Warehouse warehouse, BigDecimal quantity,
                  BigDecimal balanceAfter, String reason, String reference, UUID transferGroup) {
        this.type = type;
        this.product = product;
        this.warehouse = warehouse;
        this.quantity = quantity;
        this.balanceAfter = balanceAfter;
        this.reason = reason;
        this.reference = reference;
        this.transferGroup = transferGroup;
    }

    public Long getId() { return id; }
    public MovementType getType() { return type; }
    public Product getProduct() { return product; }
    public Warehouse getWarehouse() { return warehouse; }
    public BigDecimal getQuantity() { return quantity; }
    public BigDecimal getBalanceAfter() { return balanceAfter; }
    public String getReason() { return reason; }
    public String getReference() { return reference; }
    public UUID getTransferGroup() { return transferGroup; }
    public Instant getCreatedAt() { return createdAt; }
    public String getCreatedBy() { return createdBy; }
}
