package com.invsys.audit.app;

import com.invsys.audit.domain.AuditAction;
import java.time.Instant;

public record AuditEvent(Instant occurredAt, String actor, AuditAction action, String entityType, String entityId, String summary) {}
