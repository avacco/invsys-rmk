import { beforeEach, describe, expect, it } from 'vitest'
import { authApi, inventoryApi, productsApi, warehousesApi } from '@/api/endpoints'

/** Reglas de inventario del backend simulado (deben coincidir con la API real). */
describe('inventario (demo)', () => {
  beforeEach(async () => {
    await authApi.login({ username: 'admin', password: 'admin1234' })
  })

  it('una salida descuenta el saldo y queda en el historial', async () => {
    const [m] = await inventoryApi.register({ type: 'OUT', productId: 1, warehouseId: 1, quantity: 5 })
    expect(m.quantity).toBe(-5)
    expect(m.balanceAfter).toBe(30)
    const history = await inventoryApi.movements({ productId: 1 })
    expect(history.content[0].id).toBe(m.id)
  })

  it('no permite dejar stock negativo (409)', async () => {
    await expect(inventoryApi.register({ type: 'OUT', productId: 6, warehouseId: 1, quantity: 10 }))
      .rejects.toMatchObject({ status: 409 })
  })

  it('respeta los decimales de la unidad', async () => {
    await expect(inventoryApi.register({ type: 'IN', productId: 6, warehouseId: 1, quantity: 1.5 }))
      .rejects.toMatchObject({ status: 400 })
    await expect(inventoryApi.register({ type: 'IN', productId: 3, warehouseId: 1, quantity: 1.25 })).resolves.toHaveLength(1)
  })

  it('una transferencia genera salida y entrada', async () => {
    const result = await inventoryApi.register({ type: 'TRANSFER', productId: 2, warehouseId: 1, targetWarehouseId: 2, quantity: 15 })
    expect(result.map((m) => m.type)).toEqual(['TRANSFER_OUT', 'TRANSFER_IN'])
    const [row] = (await inventoryApi.stock({ q: 'ALI-002' })).content
    expect(row.total).toBe(40)
    expect(row.levels.map((l) => l.quantity).sort()).toEqual([15, 25])
  })

  it('el ajuste registra la diferencia con lo contado', async () => {
    await expect(inventoryApi.register({ type: 'ADJUSTMENT', productId: 1, warehouseId: 1, quantity: 30 }))
      .rejects.toMatchObject({ status: 400 })
    const [m] = await inventoryApi.register({ type: 'ADJUSTMENT', productId: 1, warehouseId: 1, quantity: 30, reason: 'Conteo' })
    expect(m.quantity).toBe(-5)
  })

  it('lista solo los productos con stock bajo', async () => {
    const low = await inventoryApi.stock({ lowOnly: true })
    expect(low.content.every((r) => r.low)).toBe(true)
    expect(low.content.map((r) => r.product.sku)).toContain('FER-001')
  })

  it('no borra productos ni almacenes con movimientos', async () => {
    await expect(productsApi.remove(1)).rejects.toMatchObject({ status: 409 })
    await expect(warehousesApi.remove(1)).rejects.toMatchObject({ status: 409 })
  })

  it('un usuario de solo lectura no puede registrar movimientos', async () => {
    await authApi.login({ username: 'viewer', password: 'viewer1234' })
    await expect(inventoryApi.stock({})).resolves.toBeDefined()
    await expect(inventoryApi.register({ type: 'IN', productId: 1, warehouseId: 1, quantity: 1 }))
      .rejects.toMatchObject({ status: 403 })
  })
})
