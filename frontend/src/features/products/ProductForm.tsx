import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, Trash2 } from 'lucide-react'
import type { Category, Product, Supplier, Unit } from '@/api/types'
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui'
import { handleApiError } from '@/lib/errors'
import { safeImageUrl } from '@/lib/url'
import { toast } from '@/store/toast'
import placeholder from '@/assets/product-placeholder.png'
import { emptyProduct, IMAGE_TYPES, MAX_IMAGE_BYTES, productSchema, toFormValues, toRequest, type ProductFormValues } from './productSchema'
import { useRemoveProductImage, useSaveProduct } from './useProducts'
import { useTranslation } from 'react-i18next'

const toNullableId = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))

interface Props {
  open: boolean
  product: Product | null
  categories: Category[]
  units: Unit[]
  suppliers: Supplier[]
  onClose: () => void
}

export function ProductForm({ open, product, categories, units, suppliers, onClose }: Props) {
  const { t } = useTranslation()
  const save = useSaveProduct()
  const removeImage = useRemoveProductImage()
  const [image, setImage] = useState<File | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [currentImage, setCurrentImage] = useState<string | undefined>(product?.imageUrl)

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProduct,
  })

  useEffect(() => {
    if (!open) return
    reset(product ? toFormValues(product) : { ...emptyProduct, unitId: (units.find((u) => u.code === 'u') ?? units[0])?.id ?? 0 })
    setImage(null)
    setImageError(null)
    setCurrentImage(product?.imageUrl)
  }, [open, product, units, reset])

  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const pickImage = (file: File | undefined) => {
    setImageError(null)
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) return setImageError('Formato no soportado. Usa PNG, JPG, WEBP o GIF')
    if (file.size > MAX_IMAGE_BYTES) return setImageError('La imagen supera los 5 MB')
    setImage(file)
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ id: product?.id, body: toRequest(values), image })
      toast.success(product ? t('Producto actualizado') : t('Producto creado'))
      onClose()
    } catch (e) {
      handleApiError(e, setError)
    }
  })

  const deleteImage = async () => {
    if (!product) return
    try {
      await removeImage.mutateAsync(product.id)
      setCurrentImage(undefined)
      toast.success('Imagen eliminada')
    } catch (e) {
      handleApiError(e)
    }
  }

  const shownImage = preview ?? safeImageUrl(currentImage)

  return (
    <Modal open={open} size="lg" title={product ? t('Editar {{name}}', { name: product.name }) : t('Nuevo producto')} onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t('Cancelar')}</Button>
        <Button type="submit" form="product-form" loading={save.isPending}>{t('Guardar')}</Button>
      </>}>
      <form id="product-form" onSubmit={onSubmit} noValidate className="grid gap-4 md:grid-cols-[180px_1fr]">
        <div className="flex flex-col items-center gap-2">
          <img src={shownImage || placeholder} alt="" className="h-40 w-40 rounded-lg border border-gray-200 object-contain dark:border-gray-700" />
          <label className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
            <ImagePlus className="h-4 w-4" /> {shownImage ? t('Cambiar imagen') : t('Agregar imagen')}
            <input type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" onChange={(e) => pickImage(e.target.files?.[0])} />
          </label>
          {product && currentImage && !image && (
            <button type="button" onClick={() => void deleteImage()} className="inline-flex cursor-pointer items-center gap-1 text-sm text-red-600 hover:underline">
              <Trash2 className="h-4 w-4" /> {t('Quitar imagen')}
            </button>
          )}
          {imageError && <p role="alert" className="text-center text-xs text-red-600">{t(imageError)}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('SKU')} htmlFor="sku" error={errors.sku?.message}>
            <Input id="sku" {...register('sku')} />
          </Field>
          <Field label={t('Estado')} htmlFor="status" error={errors.status?.message}>
            <Select id="status" {...register('status')}>
              <option value="ACTIVE">{t('Activo')}</option>
              <option value="INACTIVE">{t('Inactivo')}</option>
            </Select>
          </Field>
          <Field label={t('Nombre')} htmlFor="name" error={errors.name?.message} className="sm:col-span-2">
            <Input id="name" {...register('name')} />
          </Field>
          <Field label={t('Categoría')} htmlFor="categoryId" error={errors.categoryId?.message}>
            <Select id="categoryId" {...register('categoryId', { setValueAs: toNullableId })}>
              <option value="">{t('Sin categoría')}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label={t('Unidad')} htmlFor="unitId" error={errors.unitId?.message}>
            <Select id="unitId" {...register('unitId', { valueAsNumber: true })}>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
            </Select>
          </Field>
          <Field label={t('Proveedor')} htmlFor="supplierId" error={errors.supplierId?.message} className="sm:col-span-2">
            <Select id="supplierId" {...register('supplierId', { setValueAs: toNullableId })}>
              <option value="">{t('Sin proveedor')}</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label={t('Costo')} htmlFor="costPrice" error={errors.costPrice?.message}>
            <Input id="costPrice" type="number" step="0.01" min="0" {...register('costPrice', { valueAsNumber: true })} />
          </Field>
          <Field label={t('Precio de venta')} htmlFor="salePrice" error={errors.salePrice?.message}>
            <Input id="salePrice" type="number" step="0.01" min="0" {...register('salePrice', { valueAsNumber: true })} />
          </Field>
          <Field label={t('Stock mínimo')} htmlFor="minStock" error={errors.minStock?.message}>
            <Input id="minStock" type="number" step="any" min="0" {...register('minStock', { valueAsNumber: true })} />
          </Field>
          <Field label={t('Descripción')} htmlFor="description" error={errors.description?.message} className="sm:col-span-2">
            <Textarea id="description" rows={3} {...register('description')} />
          </Field>
        </div>
      </form>
    </Modal>
  )
}
