package com.invsys.shared.persistence;

import java.time.Instant;

/** Datos de auditoría expuestos en las respuestas de la API. */
public record AuditInfo(Instant createdAt, String createdBy, Instant updatedAt, String updatedBy) {

    public static AuditInfo of(AuditableEntity entity) {
        return new AuditInfo(entity.getCreatedAt(), entity.getCreatedBy(), entity.getUpdatedAt(), entity.getUpdatedBy());
    }
}
