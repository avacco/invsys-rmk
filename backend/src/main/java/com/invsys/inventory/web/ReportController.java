package com.invsys.inventory.web;

import com.invsys.inventory.app.ReportService;
import com.invsys.inventory.app.ReportService.ActivityDay;
import com.invsys.inventory.app.ReportService.TopProduct;
import com.invsys.inventory.app.ReportService.ValuationGroup;
import com.invsys.inventory.app.ReportService.ValuationRow;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports")
@PreAuthorize("hasAuthority('inventory:read')")
public class ReportController {

    private final ReportService reports;

    public ReportController(ReportService reports) {
        this.reports = reports;
    }

    @GetMapping("/valuation")
    public List<ValuationRow> valuation(@RequestParam(defaultValue = "CATEGORY") ValuationGroup groupBy) {
        return reports.valuation(groupBy);
    }

    @GetMapping("/activity")
    public List<ActivityDay> activity(@RequestParam(defaultValue = "30") int days,
                                      @RequestParam(required = false) String tz) {
        return reports.activity(days, tz);
    }

    @GetMapping("/top-products")
    public List<TopProduct> topProducts(@RequestParam(defaultValue = "30") int days,
                                        @RequestParam(defaultValue = "10") int limit) {
        return reports.topProducts(days, limit);
    }
}
