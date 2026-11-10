import { z } from 'zod'
import type { Product, ProductRequest } from '@/api/types'

const money = z
  .number({ invalid_type_error: 'Ingresá un número' })
  .min(0, 'No puede ser negativo')
  .max(999_999_999_999, 'Demasiado grande')
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Máximo 2 decimales')

const optionalId = z.number().int().positive().nullable()

export const productSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .min(1, 'El SKU es obligatorio')
      .max(64, 'Máximo 64 caracteres')
      .regex(/^[A-Za-z0-9._-]+$/, 'Solo letras, números, punto, guion y guion bajo'),
    name: z.string().trim().min(1, 'El nombre es obligatorio').max(150, 'Máximo 150 caracteres'),
    description: z.string().max(4000, 'Máximo 4000 caracteres'),
    categoryId: optionalId,
    unitId: z.number({ invalid_type_error: 'Elegí una unidad' }).int().positive('Elegí una unidad'),
    supplierId: optionalId,
    costPrice: money,
    salePrice: money,
    minStock: z.number({ invalid_type_error: 'Ingresá un número' }).min(0, 'No puede ser negativo'),
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .refine((p) => p.salePrice >= p.costPrice || p.salePrice === 0, {
    path: ['salePrice'],
    message: 'El precio de venta es menor que el costo',
  })

export type ProductFormValues = z.infer<typeof productSchema>

export const emptyProduct: ProductFormValues = {
  sku: '',
  name: '',
  description: '',
  categoryId: null,
  unitId: 0,
  supplierId: null,
  costPrice: 0,
  salePrice: 0,
  minStock: 0,
  status: 'ACTIVE',
}

export function toFormValues(p: Product): ProductFormValues {
  return {
    sku: p.sku,
    name: p.name,
    description: p.description ?? '',
    categoryId: p.category?.id ?? null,
    unitId: p.unit.id,
    supplierId: p.supplier?.id ?? null,
    costPrice: p.costPrice,
    salePrice: p.salePrice,
    minStock: p.minStock,
    status: p.status,
  }
}

export function toRequest(v: ProductFormValues): ProductRequest {
  return { ...v, description: v.description.trim() || null }
}

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
