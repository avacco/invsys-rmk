package com.invsys.audit.web;

import com.invsys.audit.app.AuditQueryService;
import com.invsys.audit.app.AuditQueryService.AuditEntryResponse;
import com.invsys.audit.app.AuditQueryService.AuditFilter;
import com.invsys.audit.domain.AuditAction;
import com.invsys.shared.web.PageResponse;
import java.time.Instant;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {

    private final AuditQueryService audit;

    public AuditController(AuditQueryService audit) {
        this.audit = audit;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('audit:read')")
    public PageResponse<AuditEntryResponse> search(
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) AuditAction action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @PageableDefault(size = 25, sort = "occurredAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.of(audit.search(new AuditFilter(actor, action, entityType, entityId, q, from, to), pageable));
    }
}
