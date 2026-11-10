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
import com.invsys.audit.app.AuditLog;
import com.invsys.audit.domain.AuditAction;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class WarehouseService {

    private final WarehouseRepository warehouses;
    private final StockMovementRepository movements;

    private final AuditLog audit;

    public WarehouseService(WarehouseRepository warehouses, StockMovementRepository movements, AuditLog audit) {
        this.audit = audit;
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
            throw new ConflictException("error.warehouse.duplicate", code);
        }
        Warehouse saved = warehouses.save(
                new Warehouse(code, request.name().trim(), clean(request.address()), request.active() == null || request.active()));
        audit.record(AuditAction.CREATE, "warehouse", saved.getId(), saved.getName() + " (" + code + ")");
        return WarehouseResponse.of(saved);
    }

    public WarehouseResponse update(Long id, WarehouseRequest request) {
        Warehouse warehouse = find(id);
        String code = request.code().trim().toUpperCase();
        if (warehouses.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new ConflictException("error.warehouse.duplicate", code);
        }
        warehouse.update(code, request.name().trim(), clean(request.address()), request.active() == null || request.active());
        audit.record(AuditAction.UPDATE, "warehouse", id, warehouse.getName() + " (" + code + ")");
        return WarehouseResponse.of(warehouse);
    }

    public void delete(Long id) {
        Warehouse warehouse = find(id);
        if (movements.existsByWarehouseId(id)) {
            throw new ConflictException("error.warehouse.hasMovements");
        }
        warehouses.delete(warehouse);
        audit.record(AuditAction.DELETE, "warehouse", id, warehouse.getName() + " (" + warehouse.getCode() + ")");
    }

    private Warehouse find(Long id) {
        return warehouses.findById(id).orElseThrow(() -> new NotFoundException("warehouse", id));
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
