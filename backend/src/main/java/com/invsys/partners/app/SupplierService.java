package com.invsys.partners.app;

import com.invsys.partners.app.SupplierDtos.SupplierRequest;
import com.invsys.partners.app.SupplierDtos.SupplierResponse;
import com.invsys.partners.domain.Supplier;
import com.invsys.partners.domain.SupplierRepository;
import com.invsys.shared.web.ConflictException;
import com.invsys.shared.web.NotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import com.invsys.audit.app.AuditLog;
import com.invsys.audit.domain.AuditAction;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SupplierService {

    private final SupplierRepository suppliers;
    private final SupplierUsage usage;

    private final AuditLog audit;

    public SupplierService(SupplierRepository suppliers, SupplierUsage usage, AuditLog audit) {
        this.audit = audit;
        this.suppliers = suppliers;
        this.usage = usage;
    }

    @Transactional(readOnly = true)
    public Page<SupplierResponse> list(String q, Boolean active, Pageable pageable) {
        Specification<Supplier> spec = (root, query, cb) -> cb.conjunction();
        if (q != null && !q.isBlank()) {
            String like = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(cb.coalesce(root.<String>get("taxId"), "")), like)));
        }
        if (active != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("active"), active));
        }
        return suppliers.findAll(spec, pageable).map(SupplierResponse::of);
    }

    @Transactional(readOnly = true)
    public SupplierResponse get(Long id) {
        return SupplierResponse.of(find(id));
    }

    public SupplierResponse create(SupplierRequest request) {
        Supplier supplier = new Supplier(request.name().trim());
        apply(supplier, request);
        Supplier saved = suppliers.save(supplier);
        audit.record(AuditAction.CREATE, "supplier", saved.getId(), saved.getName());
        return SupplierResponse.of(saved);
    }

    public SupplierResponse update(Long id, SupplierRequest request) {
        Supplier supplier = find(id);
        apply(supplier, request);
        audit.record(AuditAction.UPDATE, "supplier", id, supplier.getName());
        return SupplierResponse.of(supplier);
    }

    public void delete(Long id) {
        Supplier supplier = find(id);
        if (usage.isInUse(id)) {
            throw new ConflictException("error.supplier.inUse");
        }
        suppliers.delete(supplier);
        audit.record(AuditAction.DELETE, "supplier", id, supplier.getName());
    }

    private Supplier find(Long id) {
        return suppliers.findById(id).orElseThrow(() -> new NotFoundException("supplier", id));
    }

    private static void apply(Supplier s, SupplierRequest r) {
        s.update(r.name().trim(), clean(r.taxId()), clean(r.email()), clean(r.phone()), clean(r.address()),
                clean(r.notes()), r.active() == null || r.active());
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
