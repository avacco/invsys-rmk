package com.invsys.catalog.app;

import com.invsys.catalog.app.CatalogDtos.ProductFilter;
import com.invsys.catalog.app.CatalogDtos.ProductRequest;
import com.invsys.catalog.app.CatalogDtos.ProductResponse;
import com.invsys.catalog.domain.Category;
import com.invsys.catalog.domain.CategoryRepository;
import com.invsys.catalog.domain.Product;
import com.invsys.catalog.domain.ProductRepository;
import com.invsys.catalog.domain.Unit;
import com.invsys.catalog.domain.UnitRepository;
import com.invsys.partners.domain.Supplier;
import com.invsys.partners.domain.SupplierRepository;
import com.invsys.shared.web.BadRequestException;
import com.invsys.shared.web.ConflictException;
import com.invsys.shared.web.NotFoundException;
import com.invsys.storage.FileStorage;
import java.math.BigDecimal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class ProductService {

    private final ProductRepository products;
    private final CategoryRepository categories;
    private final UnitRepository units;
    private final SupplierRepository suppliers;
    private final FileStorage storage;

    public ProductService(ProductRepository products, CategoryRepository categories, UnitRepository units,
                          SupplierRepository suppliers, FileStorage storage) {
        this.products = products;
        this.categories = categories;
        this.units = units;
        this.suppliers = suppliers;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> list(ProductFilter filter, Pageable pageable) {
        return products.findAll(specification(filter), pageable).map(ProductResponse::of);
    }

    @Transactional(readOnly = true)
    public ProductResponse get(Long id) {
        return ProductResponse.of(find(id));
    }

    public ProductResponse create(ProductRequest request) {
        String sku = request.sku().trim();
        if (products.existsBySkuIgnoreCase(sku)) {
            throw new ConflictException("Ya existe un producto con el SKU " + sku);
        }
        Product product = new Product(sku);
        apply(product, request);
        return ProductResponse.of(products.save(product));
    }

    public ProductResponse update(Long id, ProductRequest request) {
        Product product = find(id);
        if (products.existsBySkuIgnoreCaseAndIdNot(request.sku().trim(), id)) {
            throw new ConflictException("Ya existe un producto con el SKU " + request.sku().trim());
        }
        apply(product, request);
        return ProductResponse.of(product);
    }

    public void delete(Long id) {
        Product product = find(id);
        String imageUrl = product.getImageUrl();
        products.delete(product);
        products.flush();
        storage.delete(imageUrl);
    }

    public ProductResponse replaceImage(Long id, MultipartFile file) {
        Product product = find(id);
        String previous = product.getImageUrl();
        product.setImageUrl(storage.storeImage(file, "products"));
        storage.delete(previous);
        return ProductResponse.of(product);
    }

    public ProductResponse removeImage(Long id) {
        Product product = find(id);
        storage.delete(product.getImageUrl());
        product.setImageUrl(null);
        return ProductResponse.of(product);
    }

    private Product find(Long id) {
        return products.findById(id).orElseThrow(() -> new NotFoundException("Producto", id));
    }

    private void apply(Product product, ProductRequest r) {
        Category category = r.categoryId() == null ? null : categories.findById(r.categoryId())
                .orElseThrow(() -> new BadRequestException("La categoría " + r.categoryId() + " no existe"));
        Unit unit = units.findById(r.unitId())
                .orElseThrow(() -> new BadRequestException("La unidad " + r.unitId() + " no existe"));
        Supplier supplier = r.supplierId() == null ? null : suppliers.findById(r.supplierId())
                .orElseThrow(() -> new BadRequestException("El proveedor " + r.supplierId() + " no existe"));
        String description = r.description() == null || r.description().isBlank() ? null : r.description().trim();
        BigDecimal minStock = r.minStock() == null ? BigDecimal.ZERO : r.minStock();
        product.update(r.sku().trim(), r.name().trim(), description, category, unit, supplier,
                r.costPrice(), r.salePrice(), minStock, r.status());
    }

    private static Specification<Product> specification(ProductFilter f) {
        Specification<Product> spec = (root, query, cb) -> cb.conjunction();
        if (f.q() != null && !f.q().isBlank()) {
            String like = "%" + f.q().trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("sku")), like)));
        }
        if (f.categoryId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("category").get("id"), f.categoryId()));
        }
        if (f.supplierId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("supplier").get("id"), f.supplierId()));
        }
        if (f.status() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), f.status()));
        }
        return spec;
    }
}
