package com.invsys.inventory.app;

import com.invsys.inventory.app.InventoryDtos.WarehouseRequest;
import com.invsys.inventory.app.InventoryDtos.WarehouseResponse;
import com.invsys.inventory.domain.StockMovementRepository;
import com.invsys.inventory.domain.Warehouse;
import com.invsys.inventory.domain.WarehouseRepository;
import com.invsys.shared.web.ConflictException;
import com.invsys.shared.web.NotFoundException;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class WarehouseService {

    private final WarehouseRepository warehouses;
    private final StockMovementRepository movements;

    public WarehouseService(WarehouseRepository warehouses, StockMovementRepository movements) {
        this.warehouses = warehouses;
        this.movements = movements;
    }

    @Transactional(readOnly = true)
    public List<WarehouseResponse> list() {
        return warehouses.findAll(Sort.by("name")).stream().map(WarehouseResponse::of).toList();
    }

    public WarehouseResponse create(WarehouseRequest request) {
        String code = request.code().trim().toUpperCase();
        if (warehouses.existsByCodeIgnoreCase(code)) {
            throw new ConflictException("Ya existe un almacén con el código " + code);
        }
        return WarehouseResponse.of(warehouses.save(
                new Warehouse(code, request.name().trim(), clean(request.address()), request.active() == null || request.active())));
    }

    public WarehouseResponse update(Long id, WarehouseRequest request) {
        Warehouse warehouse = find(id);
        String code = request.code().trim().toUpperCase();
        if (warehouses.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new ConflictException("Ya existe un almacén con el código " + code);
        }
        warehouse.update(code, request.name().trim(), clean(request.address()), request.active() == null || request.active());
        return WarehouseResponse.of(warehouse);
    }

    public void delete(Long id) {
        Warehouse warehouse = find(id);
        if (movements.existsByWarehouseId(id)) {
            throw new ConflictException("El almacén tiene movimientos registrados; desactivalo en lugar de eliminarlo");
        }
        warehouses.delete(warehouse);
    }

    private Warehouse find(Long id) {
        return warehouses.findById(id).orElseThrow(() -> new NotFoundException("Almacén", id));
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
