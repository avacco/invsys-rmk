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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UnitService {

    private final UnitRepository units;
    private final ProductRepository products;

    public UnitService(UnitRepository units, ProductRepository products) {
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
            throw new ConflictException("Ya existe una unidad con ese código");
        }
        return UnitResponse.of(units.save(new Unit(code, request.name().trim(), request.decimals())));
    }

    public UnitResponse update(Long id, UnitRequest request) {
        Unit unit = find(id);
        String code = request.code().trim();
        if (units.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new ConflictException("Ya existe una unidad con ese código");
        }
        unit.update(code, request.name().trim(), request.decimals());
        return UnitResponse.of(unit);
    }

    public void delete(Long id) {
        Unit unit = find(id);
        if (products.existsByUnitId(id)) {
            throw new ConflictException("La unidad está en uso");
        }
        units.delete(unit);
    }

    private Unit find(Long id) {
        return units.findById(id).orElseThrow(() -> new NotFoundException("Unidad", id));
    }
}
