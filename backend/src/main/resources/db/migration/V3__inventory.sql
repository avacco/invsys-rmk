-- Inventario: almacenes, saldos por producto y almacén, y movimientos (ADR 0003).

CREATE TABLE warehouses (
    id         BIGSERIAL PRIMARY KEY,
    code       VARCHAR(32)  NOT NULL UNIQUE,
    name       VARCHAR(100) NOT NULL,
    address    VARCHAR(255),
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by VARCHAR(100)
);

-- Saldo actual de cada producto en cada almacén. Se actualiza en la misma transacción que el
-- movimiento que lo modifica, y siempre se puede reconstruir sumando los movimientos.
CREATE TABLE stock_levels (
    product_id   BIGINT         NOT NULL REFERENCES products (id),
    warehouse_id BIGINT         NOT NULL REFERENCES warehouses (id),
    quantity     NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    PRIMARY KEY (product_id, warehouse_id)
);

CREATE INDEX idx_stock_levels_warehouse ON stock_levels (warehouse_id);

-- Movimientos inmutables. quantity es el cambio con signo (+ entra, - sale).
-- Una transferencia genera dos filas (TRANSFER_OUT y TRANSFER_IN) con el mismo transfer_group.
CREATE TABLE stock_movements (
    id             BIGSERIAL PRIMARY KEY,
    type           VARCHAR(16)    NOT NULL,
    product_id     BIGINT         NOT NULL REFERENCES products (id),
    warehouse_id   BIGINT         NOT NULL REFERENCES warehouses (id),
    quantity       NUMERIC(14, 3) NOT NULL CHECK (quantity <> 0),
    balance_after  NUMERIC(14, 3) NOT NULL CHECK (balance_after >= 0),
    reason         VARCHAR(255),
    reference      VARCHAR(100),
    transfer_group UUID,
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
    created_by     VARCHAR(100)
);

CREATE INDEX idx_stock_movements_product ON stock_movements (product_id, created_at DESC);
CREATE INDEX idx_stock_movements_warehouse ON stock_movements (warehouse_id, created_at DESC);
CREATE INDEX idx_stock_movements_created ON stock_movements (created_at DESC);

-- Permisos de inventario
INSERT INTO role_permissions (role_id, permission)
SELECT r.id, p.permission
FROM roles r
CROSS JOIN (VALUES ('inventory:read'), ('inventory:write')) AS p (permission)
WHERE r.name IN ('ADMIN', 'MANAGER');

INSERT INTO role_permissions (role_id, permission)
SELECT r.id, 'inventory:read' FROM roles r WHERE r.name = 'VIEWER';

-- Almacén por defecto para que el sistema sea usable desde el primer inicio.
INSERT INTO warehouses (code, name) VALUES ('MAIN', 'Almacén principal');
