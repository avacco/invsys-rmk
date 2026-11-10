import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { suppliersApi } from '@/api/endpoints'
import type { Supplier } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { RowActions } from '@/components/RowActions'
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, Spinner, Table, Td, Textarea, Th } from '@/components/ui'
import { handleApiError } from '@/lib/errors'
import { useDebounce } from '@/lib/useDebounce'
import { toast } from '@/store/toast'
import { useTranslation } from 'react-i18next'
import { tk } from '@/i18n'

const schema = z.object({
  name: z.string().trim().min(1, tk('El nombre es obligatorio')).max(150),
  taxId: z.string().trim().max(50),
  email: z.union([z.literal(''), z.string().trim().pipe(z.email(tk('Email inválido')).max(255))]),
  phone: z.string().trim().max(50),
  address: z.string().trim().max(255),
  notes: z.string().max(2000),
  active: z.boolean(),
})
type Values = z.infer<typeof schema>

const empty: Values = { name: '', taxId: '', email: '', phone: '', address: '', notes: '', active: true }
const nullIfBlank = (v: string) => (v.trim() ? v.trim() : null)

function SupplierForm({ open, supplier, onClose }: { open: boolean; supplier: Supplier | null; onClose: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty })
  useEffect(() => {
    if (!open) return
    reset(supplier ? {
      name: supplier.name, taxId: supplier.taxId ?? '', email: supplier.email ?? '', phone: supplier.phone ?? '',
      address: supplier.address ?? '', notes: supplier.notes ?? '', active: supplier.active,
    } : empty)
  }, [open, supplier, reset])
  const save = useMutation({
    mutationFn: (v: Values) => {
      const body = { name: v.name, taxId: nullIfBlank(v.taxId), email: nullIfBlank(v.email), phone: nullIfBlank(v.phone),
        address: nullIfBlank(v.address), notes: nullIfBlank(v.notes), active: v.active }
      return supplier ? suppliersApi.update(supplier.id, body) : suppliersApi.create(body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(v)
      toast.success(supplier ? t('Proveedor actualizado') : t('Proveedor creado'))
      onClose()
    } catch (e) {
      handleApiError(e, setError)
    }
  })
  return (
    <Modal open={open} size="lg" title={supplier ? t('Editar proveedor') : t('Nuevo proveedor')} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Cancelar')}</Button><Button type="submit" form="supplier-form" loading={save.isPending}>{t('Guardar')}</Button></>}>
      <form id="supplier-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label={t('Nombre')} htmlFor="s-name" error={errors.name?.message} className="sm:col-span-2"><Input id="s-name" {...register('name')} /></Field>
        <Field label={t('Identificación fiscal')} htmlFor="s-tax" error={errors.taxId?.message}><Input id="s-tax" {...register('taxId')} /></Field>
        <Field label={t('Estado')} htmlFor="s-active">
          <Select id="s-active" {...register('active', { setValueAs: (v) => v === true || v === 'true' })}>
            <option value="true">{t('Activo')}</option>
            <option value="false">{t('Inactivo')}</option>
          </Select>
        </Field>
        <Field label={t('Email')} htmlFor="s-email" error={errors.email?.message}><Input id="s-email" type="email" {...register('email')} /></Field>
        <Field label={t('Teléfono')} htmlFor="s-phone" error={errors.phone?.message}><Input id="s-phone" {...register('phone')} /></Field>
        <Field label={t('Dirección')} htmlFor="s-address" error={errors.address?.message} className="sm:col-span-2"><Input id="s-address" {...register('address')} /></Field>
        <Field label={t('Notas')} htmlFor="s-notes" error={errors.notes?.message} className="sm:col-span-2"><Textarea id="s-notes" rows={3} {...register('notes')} /></Field>
      </form>
    </Modal>
  )
}

export default function SuppliersPage() {
  const { t } = useTranslation()
  const { can } = useAuth()
  const canWrite = can('partners:write')
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const q = useDebounce(search)
  const list = useQuery({
    queryKey: ['suppliers', 'list', q, page],
    queryFn: () => suppliersApi.list({ q, page, size: 20, sort: 'name' }),
    placeholderData: keepPreviousData,
  })
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<Supplier | null>(null)
  const remove = useMutation({ mutationFn: suppliersApi.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }) })

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Proveedor eliminado')
    } catch (e) {
      handleApiError(e)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <PageHeader title={t('Proveedores')} description={t('Empresas a las que se compran los productos.')}
        actions={canWrite && <Button onClick={() => { setEditing(null); setOpen(true) }} icon={<Plus className="h-4 w-4" />}>{t('Nuevo proveedor')}</Button>} />
      <div className="mb-6"><SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder={t('Buscar por nombre o identificación')} /></div>
      {list.isPending ? <Spinner /> : list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> :
        list.data.content.length === 0 ? <EmptyState title={t('No hay proveedores')} /> : (
          <>
            <Table>
              <thead><tr><Th>{t('Nombre')}</Th><Th>{t('Identificación')}</Th><Th>{t('Contacto')}</Th><Th>{t('Estado')}</Th>{canWrite && <Th />}</tr></thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {list.data.content.map((s) => (
                  <tr key={s.id}>
                    <Td className="font-medium">{s.name}</Td>
                    <Td className="font-mono text-xs">{s.taxId ?? '—'}</Td>
                    <Td><div>{s.email ?? '—'}</div><div className="text-xs text-gray-500">{s.phone}</div></Td>
                    <Td>{s.active ? <Badge tone="green">{t('Activo')}</Badge> : <Badge>{t('Inactivo')}</Badge>}</Td>
                    {canWrite && <Td><RowActions label={s.name} onEdit={() => { setEditing(s); setOpen(true) }} onDelete={() => setDeleting(s)} /></Td>}
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={list.data.page} totalPages={list.data.totalPages} totalElements={list.data.totalElements} onChange={setPage} />
          </>
        )}
      <SupplierForm open={open} supplier={editing} onClose={() => setOpen(false)} />
      <ConfirmDialog open={deleting !== null} title={t('Eliminar proveedor')} loading={remove.isPending}
        message={t('¿Eliminar «{{name}}»? Si tiene productos asociados, conviene desactivarlo.', { name: deleting?.name })}
        onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)} />
    </>
  )
}
