package com.invsys.catalog.app;

import com.invsys.catalog.domain.Category;
import com.invsys.catalog.domain.Product;
import com.invsys.catalog.domain.ProductStatus;
import com.invsys.catalog.domain.Unit;
import com.invsys.shared.persistence.AuditInfo;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public final class CatalogDtos {

    private CatalogDtos() {}

    // --- Categorías ---

    public record CategoryRequest(@NotBlank @Size(max = 100) String name, @Size(max = 2000) String description) {}

    public record CategoryResponse(Long id, String name, String description, AuditInfo audit) {
        public static CategoryResponse of(Category c) {
            return new CategoryResponse(c.getId(), c.getName(), c.getDescription(), AuditInfo.of(c));
        }
    }

    // --- Unidades ---

    public record UnitRequest(
            @NotBlank @Size(max = 16) @Pattern(regexp = "^[a-zA-Z0-9_-]+$") String code,
            @NotBlank @Size(max = 50) String name,
            @NotNull @Min(0) @Max(3) Short decimals) {}

    public record UnitResponse(Long id, String code, String name, int decimals) {
        public static UnitResponse of(Unit u) {
            return new UnitResponse(u.getId(), u.getCode(), u.getName(), u.getDecimals());
        }
    }

    // --- Productos ---

    public record Ref(Long id, String name) {}

    public record ProductRequest(
            @NotBlank @Size(max = 64) @Pattern(regexp = "^[A-Za-z0-9._-]+$",
                    message = "solo letras, números, punto, guion y guion bajo") String sku,
            @NotBlank @Size(max = 150) String name,
            @Size(max = 4000) String description,
            Long categoryId,
            @NotNull Long unitId,
            Long supplierId,
            @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 2) BigDecimal costPrice,
            @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 2) BigDecimal salePrice,
            @DecimalMin("0") @Digits(integer = 11, fraction = 3) BigDecimal minStock,
            @NotNull ProductStatus status) {}

    public record ProductResponse(
            Long id, String sku, String name, String description,
            Ref category, UnitResponse unit, Ref supplier,
            BigDecimal costPrice, BigDecimal salePrice, BigDecimal minStock,
            ProductStatus status, String imageUrl, AuditInfo audit) {

        public static ProductResponse of(Product p) {
            return new ProductResponse(
                    p.getId(), p.getSku(), p.getName(), p.getDescription(),
                    p.getCategory() == null ? null : new Ref(p.getCategory().getId(), p.getCategory().getName()),
                    UnitResponse.of(p.getUnit()),
                    p.getSupplier() == null ? null : new Ref(p.getSupplier().getId(), p.getSupplier().getName()),
                    p.getCostPrice(), p.getSalePrice(), p.getMinStock(),
                    p.getStatus(), p.getImageUrl(), AuditInfo.of(p));
        }
    }

    /** Filtros del listado de productos. Todos opcionales. */
    public record ProductFilter(String q, Long categoryId, Long supplierId, ProductStatus status) {}
}
