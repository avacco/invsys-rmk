package com.invsys.catalog.app;

import com.invsys.catalog.app.CatalogDtos.UnitRequest;
import com.invsys.catalog.app.CatalogDtos.UnitResponse;
import com.invsys.catalog.domain.ProductRepository;
import com.invsys.catalog.domain.Unit;
import com.invsys.catalog.domain.UnitRepository;
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
public class UnitService {

    private final UnitRepository units;
    private final ProductRepository products;

    private final AuditLog audit;

    public UnitService(UnitRepository units, ProductRepository products, AuditLog audit) {
        this.audit = audit;
        this.units = units;
        this.products = products;
    }

    @Transactional(readOnly = true)
    public List<UnitResponse> list() {
        return units.findAll(Sort.by("name")).stream().map(UnitResponse::of).toList();
    }

    public UnitResponse create(UnitRequest request) {
        String code = request.code().trim();
        if (units.existsByCodeIgnoreCase(code)) {
            throw new ConflictException("error.unit.duplicate");
        }
        Unit saved = units.save(new Unit(code, request.name().trim(), request.decimals()));
        audit.record(AuditAction.CREATE, "unit", saved.getId(), saved.getName() + " (" + code + ")");
        return UnitResponse.of(saved);
    }

    public UnitResponse update(Long id, UnitRequest request) {
        Unit unit = find(id);
        String code = request.code().trim();
        if (units.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new ConflictException("error.unit.duplicate");
        }
        unit.update(code, request.name().trim(), request.decimals());
        audit.record(AuditAction.UPDATE, "unit", id, unit.getName() + " (" + code + ")");
        return UnitResponse.of(unit);
    }

    public void delete(Long id) {
        Unit unit = find(id);
        if (products.existsByUnitId(id)) {
            throw new ConflictException("error.unit.inUse");
        }
        units.delete(unit);
        audit.record(AuditAction.DELETE, "unit", id, unit.getName() + " (" + unit.getCode() + ")");
    }

    private Unit find(Long id) {
        return units.findById(id).orElseThrow(() -> new NotFoundException("unit", id));
    }
}
