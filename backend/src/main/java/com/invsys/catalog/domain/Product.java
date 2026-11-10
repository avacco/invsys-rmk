package com.invsys.catalog.domain;

import com.invsys.partners.domain.Supplier;
import com.invsys.shared.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/**
 * Producto del catálogo. No guarda stock: las existencias se calculan por almacén
 * a partir de los movimientos (módulo inventory, ver ADR 0003).
 */
@Entity
@Table(name = "products")
public class Product extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String sku;

    @Column(nullable = false, length = 150)
    private String name;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "unit_id")
    private Unit unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @Column(name = "cost_price", nullable = false, precision = 14, scale = 2)
    private BigDecimal costPrice = BigDecimal.ZERO;

    @Column(name = "sale_price", nullable = false, precision = 14, scale = 2)
    private BigDecimal salePrice = BigDecimal.ZERO;

    /** Nivel mínimo de reposición: por debajo, se genera una alerta de stock bajo. */
    @Column(name = "min_stock", nullable = false, precision = 14, scale = 3)
    private BigDecimal minStock = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ProductStatus status = ProductStatus.ACTIVE;

    @Column(name = "image_url", length = 512)
    private String imageUrl;

    protected Product() {}

    public Product(String sku) {
        this.sku = sku;
    }

    public void update(String sku, String name, String description, Category category, Unit unit, Supplier supplier,
                       BigDecimal costPrice, BigDecimal salePrice, BigDecimal minStock, ProductStatus status) {
        this.sku = sku;
        this.name = name;
        this.description = description;
        this.category = category;
        this.unit = unit;
        this.supplier = supplier;
        this.costPrice = costPrice;
        this.salePrice = salePrice;
        this.minStock = minStock;
        this.status = status;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Long getId() { return id; }
    public String getSku() { return sku; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public Category getCategory() { return category; }
    public Unit getUnit() { return unit; }
    public Supplier getSupplier() { return supplier; }
    public BigDecimal getCostPrice() { return costPrice; }
    public BigDecimal getSalePrice() { return salePrice; }
    public BigDecimal getMinStock() { return minStock; }
    public ProductStatus getStatus() { return status; }
    public String getImageUrl() { return imageUrl; }
}
