-- Identidad: roles, permisos, usuarios y refresh tokens.

CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(255),
    system      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by  VARCHAR(100),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by  VARCHAR(100)
);

-- Los permisos están definidos en el código (enum Permission); acá solo se asignan a roles.
CREATE TABLE role_permissions (
    role_id    BIGINT      NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    permission VARCHAR(64) NOT NULL,
    PRIMARY KEY (role_id, permission)
);

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    email         VARCHAR(255),
    role_id       BIGINT       NOT NULL REFERENCES roles (id),
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by    VARCHAR(100),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by    VARCHAR(100)
);

CREATE TABLE refresh_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

-- Roles base
INSERT INTO roles (name, description, system) VALUES
    ('ADMIN',   'Acceso total al sistema', TRUE),
    ('MANAGER', 'Gestiona catálogo y proveedores', FALSE),
    ('VIEWER',  'Solo lectura', FALSE);

INSERT INTO role_permissions (role_id, permission)
SELECT r.id, p.permission
FROM roles r
CROSS JOIN (VALUES
    ('catalog:read'), ('catalog:write'),
    ('partners:read'), ('partners:write'),
    ('users:read'), ('users:write'),
    ('roles:read'), ('roles:write')
) AS p (permission)
WHERE r.name = 'ADMIN';

INSERT INTO role_permissions (role_id, permission)
SELECT r.id, p.permission
FROM roles r
CROSS JOIN (VALUES
    ('catalog:read'), ('catalog:write'),
    ('partners:read'), ('partners:write'),
    ('users:read')
) AS p (permission)
WHERE r.name = 'MANAGER';

INSERT INTO role_permissions (role_id, permission)
SELECT r.id, p.permission
FROM roles r
CROSS JOIN (VALUES ('catalog:read'), ('partners:read')) AS p (permission)
WHERE r.name = 'VIEWER';
