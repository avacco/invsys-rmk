package com.invsys.inventory.web;

import com.invsys.inventory.app.InventoryDtos.WarehouseRequest;
import com.invsys.inventory.app.InventoryDtos.WarehouseResponse;
import com.invsys.inventory.app.WarehouseService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/warehouses")
public class WarehouseController {

    private final WarehouseService warehouseService;

    public WarehouseController(WarehouseService warehouseService) {
        this.warehouseService = warehouseService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('inventory:read')")
    public List<WarehouseResponse> list() {
        return warehouseService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('inventory:write')")
    public WarehouseResponse create(@Valid @RequestBody WarehouseRequest request) {
        return warehouseService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('inventory:write')")
    public WarehouseResponse update(@PathVariable Long id, @Valid @RequestBody WarehouseRequest request) {
        return warehouseService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('inventory:write')")
    public void delete(@PathVariable Long id) {
        warehouseService.delete(id);
    }
}
