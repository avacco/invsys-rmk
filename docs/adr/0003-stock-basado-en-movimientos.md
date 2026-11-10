# ADR 0003 — Stock basado en movimientos

**Estado:** aceptada · **Fecha:** 2026-11-10

## Contexto

En la versión anterior el stock era un número que se editaba a mano en el producto: no había trazabilidad, y cada producto podía estar en un solo almacén.

## Decisión

- El stock se registra **por producto y almacén**.
- Solo cambia mediante **movimientos** inmutables: entrada, salida, ajuste y transferencia, con cantidad, motivo, usuario y fecha.
- El saldo por almacén se mantiene actualizado en la misma transacción que el movimiento, y siempre se puede reconstruir a partir de los movimientos.
- Cada movimiento publica un evento `StockMoved`, que usan la auditoría y las alertas de stock bajo.

## Consecuencias

- Historial completo y auditable de cada unidad.
- Módulos futuros (compras, ventas, conteo físico) solo generan movimientos; no tocan el saldo directamente.
