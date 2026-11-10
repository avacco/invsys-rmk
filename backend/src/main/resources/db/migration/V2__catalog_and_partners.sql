-- Catálogo (categorías, unidades, productos) y proveedores.

CREATE TABLE categories (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by  VARCHAR(100),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by  VARCHAR(100)
);

CREATE TABLE units (
    id         BIGSERIAL PRIMARY KEY,
    code       VARCHAR(16)  NOT NULL UNIQUE,
    name       VARCHAR(50)  NOT NULL,
    decimals   SMALLINT     NOT NULL DEFAULT 0 CHECK (decimals BETWEEN 0 AND 3),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by VARCHAR(100)
);

CREATE TABLE suppliers (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    tax_id     VARCHAR(50),
    email      VARCHAR(255),
    phone      VARCHAR(50),
    address    VARCHAR(255),
    notes      TEXT,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by VARCHAR(100)
);

CREATE TABLE products (
    id          BIGSERIAL PRIMARY KEY,
    sku         VARCHAR(64)    NOT NULL UNIQUE,
    name        VARCHAR(150)   NOT NULL,
    description TEXT,
    category_id BIGINT REFERENCES categories (id),
    unit_id     BIGINT         NOT NULL REFERENCES units (id),
    supplier_id BIGINT REFERENCES suppliers (id),
    cost_price  NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    sale_price  NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
    min_stock   NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    status      VARCHAR(16)    NOT NULL DEFAULT 'ACTIVE',
    image_url   VARCHAR(512),
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    created_by  VARCHAR(100),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_by  VARCHAR(100)
);

CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_supplier ON products (supplier_id);
CREATE INDEX idx_products_name ON products (lower(name));

INSERT INTO units (code, name, decimals) VALUES
    ('u',   'Unidad',    0),
    ('box', 'Caja',      0),
    ('kg',  'Kilogramo', 3),
    ('g',   'Gramo',     0),
    ('l',   'Litro',     3),
    ('ml',  'Mililitro', 0),
    ('m',   'Metro',     2);
