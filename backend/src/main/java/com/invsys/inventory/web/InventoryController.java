package com.invsys.inventory.web;

import com.invsys.inventory.app.InventoryDtos.InventorySummary;
import com.invsys.inventory.app.InventoryDtos.MovementFilter;
import com.invsys.inventory.app.InventoryDtos.MovementRequest;
import com.invsys.inventory.app.InventoryDtos.MovementResponse;
import com.invsys.inventory.app.InventoryDtos.ProductStockResponse;
import com.invsys.inventory.app.InventoryDtos.StockFilter;
import com.invsys.inventory.app.InventoryService;
import com.invsys.inventory.app.StockQueryService;
import com.invsys.inventory.domain.MovementType;
import com.invsys.shared.web.PageResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {

    private final InventoryService inventoryService;
    private final StockQueryService queries;

    public InventoryController(InventoryService inventoryService, StockQueryService queries) {
        this.inventoryService = inventoryService;
        this.queries = queries;
    }

    @GetMapping("/stock")
    @PreAuthorize("hasAuthority('inventory:read')")
    public PageResponse<ProductStockResponse> stock(@RequestParam(required = false) String q,
                                                    @RequestParam(required = false) Long categoryId,
                                                    @RequestParam(defaultValue = "false") boolean lowOnly,
                                                    @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return PageResponse.of(queries.stock(new StockFilter(q, categoryId, lowOnly), pageable));
    }

    @GetMapping("/movements")
    @PreAuthorize("hasAuthority('inventory:read')")
    public PageResponse<MovementResponse> movements(@RequestParam(required = false) Long productId,
                                                    @RequestParam(required = false) Long warehouseId,
                                                    @RequestParam(required = false) MovementType type,
                                                    @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.of(queries.movements(new MovementFilter(productId, warehouseId, type), pageable));
    }

    /** Registra una entrada, salida, ajuste o transferencia. Devuelve los movimientos generados. */
    @PostMapping("/movements")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('inventory:write')")
    public List<MovementResponse> register(@Valid @RequestBody MovementRequest request) {
        return inventoryService.register(request);
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('inventory:read')")
    public InventorySummary summary() {
        return queries.summary();
    }
}
