package com.invsys.catalog.app;

import com.invsys.catalog.app.CatalogDtos.CategoryRequest;
import com.invsys.catalog.app.CatalogDtos.CategoryResponse;
import com.invsys.catalog.domain.Category;
import com.invsys.catalog.domain.CategoryRepository;
import com.invsys.catalog.domain.ProductRepository;
import com.invsys.shared.web.ConflictException;
import com.invsys.shared.web.NotFoundException;
import java.util.List;
import org.springframework.data.domain.Sort;
import com.invsys.audit.app.AuditLog;
import com.invsys.audit.domain.AuditAction;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CategoryService {

    private final CategoryRepository categories;
    private final ProductRepository products;

    private final AuditLog audit;

    public CategoryService(CategoryRepository categories, ProductRepository products, AuditLog audit) {
        this.audit = audit;
        this.categories = categories;
        this.products = products;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        return categories.findAll(Sort.by("name")).stream().map(CategoryResponse::of).toList();
    }

    @Transactional(readOnly = true)
    public CategoryResponse get(Long id) {
        return CategoryResponse.of(find(id));
    }

    public CategoryResponse create(CategoryRequest request) {
        String name = request.name().trim();
        if (categories.existsByNameIgnoreCase(name)) {
            throw new ConflictException("error.category.duplicate");
        }
        Category saved = categories.save(new Category(name, clean(request.description())));
        audit.record(AuditAction.CREATE, "category", saved.getId(), saved.getName());
        return CategoryResponse.of(saved);
    }

    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = find(id);
        String name = request.name().trim();
        if (categories.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ConflictException("error.category.duplicate");
        }
        category.update(name, clean(request.description()));
        audit.record(AuditAction.UPDATE, "category", id, name);
        return CategoryResponse.of(category);
    }

    public void delete(Long id) {
        Category category = find(id);
        if (products.existsByCategoryId(id)) {
            throw new ConflictException("error.category.inUse");
        }
        categories.delete(category);
        audit.record(AuditAction.DELETE, "category", id, category.getName());
    }

    private Category find(Long id) {
        return categories.findById(id).orElseThrow(() -> new NotFoundException("category", id));
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
