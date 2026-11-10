import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { categoriesApi, unitsApi } from '@/api/endpoints'
import type { Category, Unit } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { RowActions } from '@/components/RowActions'
import { Button, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Spinner, Table, Td, Textarea, Th } from '@/components/ui'
import { handleApiError } from '@/lib/errors'
import { toast } from '@/store/toast'

// ---------- Categorías ----------

const categorySchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  description: z.string().max(2000, 'Máximo 2000 caracteres'),
})
type CategoryValues = z.infer<typeof categorySchema>

function CategoryForm({ open, category, onClose }: { open: boolean; category: Category | null; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<CategoryValues>({ resolver: zodResolver(categorySchema) })
  useEffect(() => {
    if (open) reset({ name: category?.name ?? '', description: category?.description ?? '' })
  }, [open, category, reset])
  const save = useMutation({
    mutationFn: (v: CategoryValues) => {
      const body = { name: v.name, description: v.description.trim() || null }
      return category ? categoriesApi.update(category.id, body) : categoriesApi.create(body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(v)
      toast.success(category ? 'Categoría actualizada' : 'Categoría creada')
      onClose()
    } catch (e) {
      handleApiError(e, setError)
    }
  })
  return (
    <Modal open={open} title={category ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="category-form" loading={save.isPending}>Guardar</Button></>}>
      <form id="category-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Nombre" htmlFor="cat-name" error={errors.name?.message}><Input id="cat-name" {...register('name')} /></Field>
        <Field label="Descripción" htmlFor="cat-desc" error={errors.description?.message}><Textarea id="cat-desc" rows={3} {...register('description')} /></Field>
      </form>
    </Modal>
  )
}

function CategoriesSection({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const [editing, setEditing] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const remove = useMutation({ mutationFn: categoriesApi.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }) })

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Categoría eliminada')
    } catch (e) {
      handleApiError(e)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Categorías</h2>
        {canWrite && <Button variant="secondary" onClick={() => { setEditing(null); setOpen(true) }} icon={<Plus className="h-4 w-4" />}>Nueva</Button>}
      </div>
      {list.isPending ? <Spinner /> : list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> :
        list.data.length === 0 ? <EmptyState title="Sin categorías" /> : (
          <Table>
            <thead><tr><Th>Nombre</Th><Th>Descripción</Th>{canWrite && <Th />}</tr></thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {list.data.map((c) => (
                <tr key={c.id}>
                  <Td className="font-medium">{c.name}</Td>
                  <Td className="text-gray-500 dark:text-gray-400">{c.description ?? '—'}</Td>
                  {canWrite && <Td><RowActions label={c.name} onEdit={() => { setEditing(c); setOpen(true) }} onDelete={() => setDeleting(c)} /></Td>}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      <CategoryForm open={open} category={editing} onClose={() => setOpen(false)} />
      <ConfirmDialog open={deleting !== null} title="Eliminar categoría" loading={remove.isPending}
        message={<>¿Eliminar la categoría <strong>{deleting?.name}</strong>?</>}
        onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)} />
    </section>
  )
}

// ---------- Unidades ----------

const unitSchema = z.object({
  code: z.string().trim().min(1, 'El código es obligatorio').max(16, 'Máximo 16 caracteres').regex(/^[A-Za-z0-9_-]+$/, 'Sin espacios ni símbolos'),
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(50, 'Máximo 50 caracteres'),
  decimals: z.number().int().min(0).max(3),
})
type UnitValues = z.infer<typeof unitSchema>

function UnitForm({ open, unit, onClose }: { open: boolean; unit: Unit | null; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<UnitValues>({ resolver: zodResolver(unitSchema) })
  useEffect(() => {
    if (open) reset({ code: unit?.code ?? '', name: unit?.name ?? '', decimals: unit?.decimals ?? 0 })
  }, [open, unit, reset])
  const save = useMutation({
    mutationFn: (v: UnitValues) => (unit ? unitsApi.update(unit.id, v) : unitsApi.create(v)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] }),
  })
  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(v)
      toast.success(unit ? 'Unidad actualizada' : 'Unidad creada')
      onClose()
    } catch (e) {
      handleApiError(e, setError)
    }
  })
  return (
    <Modal open={open} title={unit ? 'Editar unidad' : 'Nueva unidad'} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="unit-form" loading={save.isPending}>Guardar</Button></>}>
      <form id="unit-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Código" htmlFor="unit-code" error={errors.code?.message}><Input id="unit-code" {...register('code')} /></Field>
        <Field label="Nombre" htmlFor="unit-name" error={errors.name?.message}><Input id="unit-name" {...register('name')} /></Field>
        <Field label="Decimales permitidos" htmlFor="unit-dec" error={errors.decimals?.message}>
          <Select id="unit-dec" {...register('decimals', { valueAsNumber: true })}>
            {[0, 1, 2, 3].map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
      </form>
    </Modal>
  )
}

function UnitsSection({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['units'], queryFn: unitsApi.list })
  const [editing, setEditing] = useState<Unit | null>(null)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<Unit | null>(null)
  const remove = useMutation({ mutationFn: unitsApi.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] }) })

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Unidad eliminada')
    } catch (e) {
      handleApiError(e)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Unidades de medida</h2>
        {canWrite && <Button variant="secondary" onClick={() => { setEditing(null); setOpen(true) }} icon={<Plus className="h-4 w-4" />}>Nueva</Button>}
      </div>
      {list.isPending ? <Spinner /> : list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : (
        <Table>
          <thead><tr><Th>Código</Th><Th>Nombre</Th><Th>Decimales</Th>{canWrite && <Th />}</tr></thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {list.data.map((u) => (
              <tr key={u.id}>
                <Td className="font-mono">{u.code}</Td>
                <Td>{u.name}</Td>
                <Td>{u.decimals}</Td>
                {canWrite && <Td><RowActions label={u.name} onEdit={() => { setEditing(u); setOpen(true) }} onDelete={() => setDeleting(u)} /></Td>}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <UnitForm open={open} unit={editing} onClose={() => setOpen(false)} />
      <ConfirmDialog open={deleting !== null} title="Eliminar unidad" loading={remove.isPending}
        message={<>¿Eliminar la unidad <strong>{deleting?.name}</strong>?</>}
        onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)} />
    </section>
  )
}

export default function CatalogPage() {
  const { can } = useAuth()
  const canWrite = can('catalog:write')
  return (
    <>
      <PageHeader title="Categorías y unidades" description="Datos de referencia del catálogo." />
      <div className="grid gap-10 xl:grid-cols-2">
        <CategoriesSection canWrite={canWrite} />
        <UnitsSection canWrite={canWrite} />
      </div>
    </>
  )
}
