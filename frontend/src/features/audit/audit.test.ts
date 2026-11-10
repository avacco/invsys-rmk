import { beforeEach, describe, expect, it } from 'vitest'
import { auditApi, authApi, categoriesApi, inventoryApi, reportsApi } from '@/api/endpoints'
import i18n from '@/i18n'
import { formatSummary } from './labels'

describe('auditoría (demo)', () => {
  beforeEach(async () => {
    await authApi.login({ username: 'admin', password: 'admin1234' })
  })

  it('registra altas, cambios y bajas con el usuario', async () => {
    const created = await categoriesApi.create({ name: 'Bebidas' })
    await categoriesApi.update(created.id, { name: 'Bebidas frías' })
    await categoriesApi.remove(created.id)
    const page = await auditApi.list({ entityType: 'category', entityId: String(created.id) })
    expect(page.content.map((e) => e.action)).toEqual(['DELETE', 'UPDATE', 'CREATE'])
    expect(page.content[0].summary).toBe('Bebidas frías')
    expect(page.content.every((e) => e.actor === 'admin')).toBe(true)
  })

  it('no registra operaciones rechazadas', async () => {
    await expect(categoriesApi.remove(1)).rejects.toMatchObject({ status: 409 })
    const page = await auditApi.list({ entityType: 'category', entityId: '1' })
    expect(page.totalElements).toBe(0)
  })

  it('registra los inicios de sesión fallidos', async () => {
    await expect(authApi.login({ username: 'intruso', password: 'x' })).rejects.toMatchObject({ status: 401 })
    await authApi.login({ username: 'admin', password: 'admin1234' })
    const page = await auditApi.list({ actor: 'intruso' })
    expect(page.content[0].action).toBe('LOGIN_FAILED')
  })

  it('registra los movimientos con un detalle traducible', async () => {
    await inventoryApi.register({ type: 'OUT', productId: 1, warehouseId: 1, quantity: 2 })
    const [entry] = (await auditApi.list({ action: 'STOCK_MOVEMENT' })).content
    expect(entry.summary).toBe('OUT · -2 u · Aceite de oliva 500 ml (ALI-001) · Almacén principal')
    expect(formatSummary(i18n.t, entry.summary)).toMatch(/^Salida · -2 u/)
  })

  it('solo ADMIN puede ver la auditoría', async () => {
    await authApi.login({ username: 'manager', password: 'manager1234' })
    await expect(auditApi.list({})).rejects.toMatchObject({ status: 403 })
  })
})

describe('reportes (demo)', () => {
  beforeEach(async () => {
    await authApi.login({ username: 'viewer', password: 'viewer1234' })
  })

  it('valoriza el stock por categoría y por almacén con el mismo total', async () => {
    const byCategory = await reportsApi.valuation('CATEGORY')
    const byWarehouse = await reportsApi.valuation('WAREHOUSE')
    const sum = (rows: { costValue: number }[]) => Math.round(rows.reduce((t, r) => t + r.costValue, 0) * 100) / 100
    expect(sum(byCategory)).toBeGreaterThan(0)
    expect(sum(byCategory)).toBe(sum(byWarehouse))
    expect(byCategory[0].costValue).toBeGreaterThanOrEqual(byCategory[byCategory.length - 1].costValue)
  })

  it('devuelve una serie diaria continua y el ranking de salidas', async () => {
    const activity = await reportsApi.activity(30, 'America/Punta_Arenas')
    expect(activity).toHaveLength(30)
    expect(activity.some((d) => d.outValue > 0)).toBe(true)
    const top = await reportsApi.topProducts(30, 3)
    expect(top).toHaveLength(3)
    expect(top[0].outValue).toBeGreaterThanOrEqual(top[1].outValue)
  })
})
