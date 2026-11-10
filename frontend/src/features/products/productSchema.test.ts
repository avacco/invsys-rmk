import { describe, expect, it } from 'vitest'
import { emptyProduct, productSchema } from './productSchema'

const valid = { ...emptyProduct, sku: 'ABC-1', name: 'Producto', unitId: 1, costPrice: 10, salePrice: 12 }

describe('productSchema', () => {
  it('acepta un producto válido', () => {
    expect(productSchema.safeParse(valid).success).toBe(true)
  })

  it('rechaza SKU con espacios', () => {
    const result = productSchema.safeParse({ ...valid, sku: 'ABC 1' })
    expect(result.success).toBe(false)
  })

  it('rechaza más de 2 decimales en precios', () => {
    expect(productSchema.safeParse({ ...valid, costPrice: 1.234 }).success).toBe(false)
    expect(productSchema.safeParse({ ...valid, costPrice: 1.23 }).success).toBe(true)
  })

  it('avisa si el precio de venta es menor al costo', () => {
    const result = productSchema.safeParse({ ...valid, salePrice: 5 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toEqual(['salePrice'])
  })

  it('muestra mensajes propios para campos numéricos vacíos o fuera de rango', () => {
    const empty = productSchema.safeParse({ ...valid, costPrice: Number.NaN, unitId: Number.NaN })
    const messages = Object.fromEntries((empty.error?.issues ?? []).map((i) => [i.path[0], i.message]))
    expect(messages.costPrice).toBe('Ingresa un número')
    expect(messages.unitId).toBe('Elige una unidad')
    expect(productSchema.safeParse({ ...valid, unitId: 0 }).error?.issues[0].message).toBe('Elige una unidad')
  })
})
