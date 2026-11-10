-- Datos ficticios para desarrollo y demo (solo perfil dev). Idempotente.

INSERT INTO categories (name, description) VALUES
    ('Alimentos',    'Productos comestibles y bebidas'),
    ('Limpieza',     'Artículos de limpieza e higiene'),
    ('Ferretería',   'Herramientas y materiales'),
    ('Indumentaria', 'Ropa y calzado de trabajo')
ON CONFLICT (name) DO NOTHING;

INSERT INTO suppliers (name, tax_id, email, phone, address, notes)
SELECT v.name, v.tax_id, v.email, v.phone, v.address, v.notes
FROM (VALUES
    ('Distribuidora Norte', 'NT-0001', 'ventas@norte.example', '+00 111 1111', 'Av. Principal 100', 'Entrega semanal'),
    ('Mayorista del Sur',   'MS-0002', 'pedidos@sur.example',  '+00 222 2222', 'Calle 2 #345',      NULL),
    ('Herramientas Centro', 'HC-0003', 'info@hcentro.example', '+00 333 3333', 'Ruta 3 km 12',      'Pago a 30 días')
) AS v (name, tax_id, email, phone, address, notes)
WHERE NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.name = v.name);

INSERT INTO products (sku, name, description, category_id, unit_id, supplier_id, cost_price, sale_price, min_stock, status)
SELECT v.sku, v.name, v.description,
       (SELECT id FROM categories WHERE name = v.category),
       (SELECT id FROM units WHERE code = v.unit),
       (SELECT id FROM suppliers WHERE name = v.supplier),
       v.cost, v.price, v.min_stock, v.status
FROM (VALUES
    ('ALI-001', 'Aceite de oliva 500 ml', 'Extra virgen',              'Alimentos',    'u',   'Distribuidora Norte', 4.50,  7.90,  20, 'ACTIVE'),
    ('ALI-002', 'Arroz largo fino',       'Paquete de 1 kg',           'Alimentos',    'u',   'Distribuidora Norte', 0.90,  1.60,  50, 'ACTIVE'),
    ('ALI-003', 'Café en grano',          'Tostado medio',             'Alimentos',    'kg',  'Mayorista del Sur',   9.00, 15.50,  10, 'ACTIVE'),
    ('LIM-001', 'Detergente 750 ml',      'Concentrado',               'Limpieza',     'u',   'Mayorista del Sur',   1.20,  2.30,  30, 'ACTIVE'),
    ('LIM-002', 'Lavandina',              'Por litro, a granel',       'Limpieza',     'l',   'Mayorista del Sur',   0.40,  0.95, 100, 'ACTIVE'),
    ('FER-001', 'Martillo carpintero',    'Mango de fibra de vidrio',  'Ferretería',   'u',   'Herramientas Centro', 6.00, 11.00,   5, 'ACTIVE'),
    ('FER-002', 'Tornillos 4x40',         'Caja x 100',                'Ferretería',   'box', 'Herramientas Centro', 2.10,  3.80,  15, 'ACTIVE'),
    ('FER-003', 'Cable unipolar 2.5 mm',  'Rollo, venta por metro',    'Ferretería',   'm',   'Herramientas Centro', 0.35,  0.70, 200, 'ACTIVE'),
    ('IND-001', 'Botas de seguridad',     'Puntera de acero',          'Indumentaria', 'u',   NULL,                 25.00, 42.00,   4, 'ACTIVE'),
    ('IND-002', 'Guantes de nitrilo',     'Discontinuado',             'Indumentaria', 'box', NULL,                  3.00,  5.50,   0, 'INACTIVE')
) AS v (sku, name, description, category, unit, supplier, cost, price, min_stock, status)
ON CONFLICT (sku) DO NOTHING;
