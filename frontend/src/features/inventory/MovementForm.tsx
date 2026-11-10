import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { inventoryApi, productsApi, warehousesApi } from '@/api/endpoints'
import type { MovementKind } from '@/api/types'
import { Button, Field, Input, Modal, Select } from '@/components/ui'
import { handleApiError } from '@/lib/errors'
import { formatNumber } from '@/lib/format'
import { toast } from '@/store/toast'
import { KIND_HELP, KIND_LABELS } from './labels'

const KINDS: MovementKind[] = ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT']

const schema = z
  .object({
    type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER']),
    productId: z.number({ invalid_type_error: 'Elegí un producto' }).int().positive('Elegí un producto'),
    warehouseId: z.number({ invalid_type_error: 'Elegí un almacén' }).int().positive('Elegí un almacén'),
    targetWarehouseId: z.number().int().positive().nullable(),
    quantity: z.number({ invalid_type_error: 'Ingresá una cantidad' }).min(0, 'No puede ser negativa'),
    reason: z.string().max(255),
    reference: z.string().max(100),
  })
  .superRefine((v, ctx) => {
    if (v.type !== 'ADJUSTMENT' && v.quantity <= 0) {
      ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Debe ser mayor que cero' })
    }
    if (v.type === 'TRANSFER') {
      if (!v.targetWarehouseId) ctx.addIssue({ code: 'custom', path: ['targetWarehouseId'], message: 'Elegí el almacén de destino' })
      else if (v.targetWarehouseId === v.warehouseId) {
        ctx.addIssue({ code: 'custom', path: ['targetWarehouseId'], message: 'Debe ser distinto del de origen' })
      }
    }
    if (v.type === 'ADJUSTMENT' && !v.reason.trim()) {
      ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Indicá el motivo del ajuste' })
    }
  })
type Values = z.infer<typeof schema>

const toNullableId = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))

interface Props {
  open: boolean
  initialProductId?: number
  onClose: () => void
}

export function MovementForm({ open, initialProductId, onClose }: Props) {
  const qc = useQueryClient()
  const products = useQuery({
    queryKey: ['products', 'options', 'active'],
    queryFn: () => productsApi.list({ status: 'ACTIVE', size: 100, sort: 'name,asc' }),
    enabled: open,
  })
  const warehouses = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list, enabled: open })
  const activeWarehouses = useMemo(() => (warehouses.data ?? []).filter((w) => w.active), [warehouses.data])

  const { register, handleSubmit, reset, watch, setError, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!open) return
    reset({
      type: 'IN',
      productId: initialProductId ?? 0,
      warehouseId: activeWarehouses[0]?.id ?? 0,
      targetWarehouseId: null,
      quantity: 0,
      reason: '',
      reference: '',
    })
  }, [open, initialProductId, activeWarehouses, reset])

  const type = watch('type')
  const productId = watch('productId')
  const warehouseId = watch('warehouseId')
  const product = products.data?.content.find((p) => p.id === productId)

  // Saldo actual del producto, para mostrarlo como referencia.
  const stock = useQuery({
    queryKey: ['inventory', 'stock', 'product', product?.sku],
    queryFn: () => inventoryApi.stock({ q: product!.sku, size: 5 }),
    enabled: open && !!product,
  })
  const row = stock.data?.content.find((r) => r.product.id === productId)
  const available = row?.levels.find((l) => l.warehouse.id === warehouseId)?.quantity ?? 0

  const save = useMutation({
    mutationFn: (v: Values) => inventoryApi.register({
      ...v,
      targetWarehouseId: v.type === 'TRANSFER' ? v.targetWarehouseId : null,
      reason: v.reason.trim() || null,
      reference: v.reference.trim() || null,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  const onSubmit = handleSubmit(async (v) => {
    const decimals = product?.unit.decimals ?? 0
    if (Math.abs(v.quantity * 10 ** decimals - Math.round(v.quantity * 10 ** decimals)) > 1e-9) {
      setError('quantity', { message: decimals === 0 ? `La unidad ${product?.unit.name} no admite decimales` : `Máximo ${decimals} decimales` })
      return
    }
    try {
      await save.mutateAsync(v)
      toast.success('Movimiento registrado')
      onClose()
    } catch (e) {
      handleApiError(e, setError)
    }
  })

  const unit = product?.unit.code ?? ''
  return (
    <Modal open={open} title="Registrar movimiento" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="movement-form" loading={save.isPending}>Registrar</Button></>}>
      <form id="movement-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</legend>
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map((k) => (
              <button key={k} type="button" onClick={() => setValue('type', k)} aria-pressed={type === k}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-left font-medium transition-colors ${type === k
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'}`}>
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
          {type && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{KIND_HELP[type]}</p>}
        </fieldset>

        <Field label="Producto" htmlFor="m-product" error={errors.productId?.message}>
          <Select id="m-product" {...register('productId', { valueAsNumber: true })}>
            <option value={0}>Elegí un producto…</option>
            {products.data?.content.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={type === 'TRANSFER' ? 'Almacén de origen' : 'Almacén'} htmlFor="m-wh" error={errors.warehouseId?.message}>
            <Select id="m-wh" {...register('warehouseId', { valueAsNumber: true })}>
              {activeWarehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </Field>
          {type === 'TRANSFER' && (
            <Field label="Almacén de destino" htmlFor="m-target" error={errors.targetWarehouseId?.message}>
              <Select id="m-target" {...register('targetWarehouseId', { setValueAs: toNullableId })}>
                <option value="">Elegí…</option>
                {activeWarehouses.filter((w) => w.id !== warehouseId).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
          )}
        </div>

        {product && (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
            Disponible en este almacén: <strong>{formatNumber(available, product.unit.decimals)} {unit}</strong>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={type === 'ADJUSTMENT' ? `Cantidad contada${unit ? ` (${unit})` : ''}` : `Cantidad${unit ? ` (${unit})` : ''}`}
            htmlFor="m-qty" error={errors.quantity?.message}>
            <Input id="m-qty" type="number" step="any" min="0" {...register('quantity', { valueAsNumber: true })} />
          </Field>
          <Field label="Referencia (opcional)" htmlFor="m-ref" error={errors.reference?.message}>
            <Input id="m-ref" placeholder="N.º de remito, pedido…" {...register('reference')} />
          </Field>
        </div>
        <Field label={type === 'ADJUSTMENT' ? 'Motivo' : 'Motivo (opcional)'} htmlFor="m-reason" error={errors.reason?.message}>
          <Input id="m-reason" {...register('reason')} />
        </Field>
      </form>
    </Modal>
  )
}
