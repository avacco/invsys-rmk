-- Registro de auditoría: quién hizo qué, sobre qué entidad y cuándo.
-- summary es un descriptor neutral respecto del idioma (nombre, SKU, cantidades); la acción se traduce en la interfaz.

CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMPTZ  NOT NULL,
    actor       VARCHAR(100),
    action      VARCHAR(32)  NOT NULL,
    entity_type VARCHAR(32),
    entity_id   VARCHAR(64),
    summary     VARCHAR(500)
);

CREATE INDEX idx_audit_log_occurred ON audit_log (occurred_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_actor ON audit_log (actor);

INSERT INTO role_permissions (role_id, permission)
SELECT r.id, 'audit:read' FROM roles r WHERE r.name = 'ADMIN';
