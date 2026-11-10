-- Stock ficticio para desarrollo y demo (solo perfil dev). Se aplica una sola vez:
-- si ya hay movimientos, no hace nada.

INSERT INTO warehouses (code, name, address)
SELECT 'NORTH', 'Depósito Norte', 'Parque industrial, nave 4'
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE code = 'NORTH');

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM stock_movements) THEN
        RETURN;
    END IF;

    CREATE TEMP TABLE demo_stock (sku TEXT, wh TEXT, qty NUMERIC) ON COMMIT DROP;
    INSERT INTO demo_stock VALUES
        ('ALI-001', 'MAIN', 35), ('ALI-001', 'NORTH', 10),
        ('ALI-002', 'MAIN', 40),
        ('ALI-003', 'MAIN', 4.5),
        ('LIM-001', 'MAIN', 60), ('LIM-001', 'NORTH', 24),
        ('LIM-002', 'NORTH', 80),
        ('FER-001', 'MAIN', 3),
        ('FER-002', 'NORTH', 40),
        ('FER-003', 'MAIN', 500), ('FER-003', 'NORTH', 150),
        ('IND-001', 'MAIN', 12);

    INSERT INTO stock_movements (type, product_id, warehouse_id, quantity, balance_after, reason, created_by)
    SELECT 'IN', p.id, w.id, d.qty, d.qty, 'Inventario inicial', 'system'
    FROM demo_stock d
    JOIN products p ON p.sku = d.sku
    JOIN warehouses w ON w.code = d.wh;

    INSERT INTO stock_levels (product_id, warehouse_id, quantity)
    SELECT p.id, w.id, d.qty
    FROM demo_stock d
    JOIN products p ON p.sku = d.sku
    JOIN warehouses w ON w.code = d.wh;
END
$$;
