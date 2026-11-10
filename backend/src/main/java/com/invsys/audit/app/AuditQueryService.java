package com.invsys.audit.app;

import com.invsys.audit.domain.AuditAction;
import com.invsys.audit.domain.AuditEntry;
import com.invsys.audit.domain.AuditEntryRepository;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AuditQueryService {

    public record AuditFilter(String actor, AuditAction action, String entityType, String entityId,
                              String q, Instant from, Instant to) {}

    public record AuditEntryResponse(Long id, Instant occurredAt, String actor, AuditAction action,
                                     String entityType, String entityId, String summary) {
        static AuditEntryResponse of(AuditEntry e) {
            return new AuditEntryResponse(e.getId(), e.getOccurredAt(), e.getActor(), e.getAction(),
                    e.getEntityType(), e.getEntityId(), e.getSummary());
        }
    }

    private final AuditEntryRepository entries;

    public AuditQueryService(AuditEntryRepository entries) {
        this.entries = entries;
    }

    public Page<AuditEntryResponse> search(AuditFilter f, Pageable pageable) {
        Specification<AuditEntry> spec = (root, query, cb) -> cb.conjunction();
        if (f.actor() != null && !f.actor().isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(cb.lower(root.get("actor")), f.actor().trim().toLowerCase()));
        }
        if (f.action() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("action"), f.action()));
        }
        if (f.entityType() != null && !f.entityType().isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("entityType"), f.entityType()));
        }
        if (f.entityId() != null && !f.entityId().isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("entityId"), f.entityId()));
        }
        if (f.q() != null && !f.q().isBlank()) {
            String like = "%" + f.q().trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("summary")), like));
        }
        if (f.from() != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("occurredAt"), f.from()));
        }
        if (f.to() != null) {
            spec = spec.and((root, query, cb) -> cb.lessThan(root.get("occurredAt"), f.to()));
        }
        return entries.findAll(spec, pageable).map(AuditEntryResponse::of);
    }
}
