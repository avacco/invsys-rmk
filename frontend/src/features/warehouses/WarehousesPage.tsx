import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { warehousesApi } from '@/api/endpoints'
import type { Warehouse } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { RowActions } from '@/components/RowActions'
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Spinner, Table, Td, Th } from '@/components/ui'
import { handleApiError } from '@/lib/errors'
import { toast } from '@/store/toast'
import { useTranslation } from 'react-i18next'
import { tk } from '@/i18n'

const schema = z.object({
  code: z.string().trim().min(1, tk('El código es obligatorio')).max(32).regex(/^[A-Za-z0-9_-]+$/, tk('Solo letras, números, guion y guion bajo')),
  name: z.string().trim().min(1, tk('El nombre es obligatorio')).max(100),
  address: z.string().trim().max(255),
  active: z.boolean(),
})
type Values = z.infer<typeof schema>

function WarehouseForm({ open, warehouse, onClose }: { open: boolean; warehouse: Warehouse | null; onClose: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (open) reset({ code: warehouse?.code ?? '', name: warehouse?.name ?? '', address: warehouse?.address ?? '', active: warehouse?.active ?? true })
  }, [open, warehouse, reset])
  const save = useMutation({
    mutationFn: (v: Values) => {
      const body = { code: v.code, name: v.name, address: v.address || null, active: v.active }
      return warehouse ? warehousesApi.update(warehouse.id, body) : warehousesApi.create(body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })
  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(v)
      toast.success(warehouse ? t('Almacén actualizado') : t('Almacén creado'))
      onClose()
    } catch (e) {
      handleApiError(e, setError)
    }
  })
  return (
    <Modal open={open} title={warehouse ? t('Editar almacén') : t('Nuevo almacén')} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Cancelar')}</Button><Button type="submit" form="warehouse-form" loading={save.isPending}>{t('Guardar')}</Button></>}>
      <form id="warehouse-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label={t('Código')} htmlFor="w-code" error={errors.code?.message}><Input id="w-code" className="uppercase" {...register('code')} /></Field>
        <Field label={t('Estado')} htmlFor="w-active">
          <Select id="w-active" {...register('active', { setValueAs: (v) => v === true || v === 'true' })}>
            <option value="true">{t('Activo')}</option>
            <option value="false">{t('Inactivo')}</option>
          </Select>
        </Field>
        <Field label={t('Nombre')} htmlFor="w-name" error={errors.name?.message} className="sm:col-span-2"><Input id="w-name" {...register('name')} /></Field>
        <Field label={t('Dirección')} htmlFor="w-address" error={errors.address?.message} className="sm:col-span-2"><Input id="w-address" {...register('address')} /></Field>
      </form>
    </Modal>
  )
}

export default function WarehousesPage() {
  const { t } = useTranslation()
  const { can } = useAuth()
  const canWrite = can('inventory:write')
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list })
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<Warehouse | null>(null)
  const remove = useMutation({ mutationFn: warehousesApi.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }) })

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Almacén eliminado')
    } catch (e) {
      handleApiError(e)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <PageHeader title={t('Almacenes')} description={t('Lugares físicos donde se guarda la mercadería.')}
        actions={canWrite && <Button onClick={() => { setEditing(null); setOpen(true) }} icon={<Plus className="h-4 w-4" />}>{t('Nuevo almacén')}</Button>} />
      {list.isPending ? <Spinner /> : list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> :
        list.data.length === 0 ? <EmptyState title={t('No hay almacenes')} /> : (
          <Table>
            <thead><tr><Th>{t('Código')}</Th><Th>{t('Nombre')}</Th><Th>{t('Dirección')}</Th><Th>{t('Estado')}</Th>{canWrite && <Th />}</tr></thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {list.data.map((w) => (
                <tr key={w.id}>
                  <Td className="font-mono">{w.code}</Td>
                  <Td className="font-medium">{w.name}</Td>
                  <Td className="text-gray-500 dark:text-gray-400">{w.address ?? '—'}</Td>
                  <Td>{w.active ? <Badge tone="green">{t('Activo')}</Badge> : <Badge>{t('Inactivo')}</Badge>}</Td>
                  {canWrite && <Td><RowActions label={w.name} onEdit={() => { setEditing(w); setOpen(true) }} onDelete={() => setDeleting(w)} /></Td>}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      <WarehouseForm open={open} warehouse={editing} onClose={() => setOpen(false)} />
      <ConfirmDialog open={deleting !== null} title={t('Eliminar almacén')} loading={remove.isPending}
        message={t('¿Eliminar «{{name}}»? Si tiene movimientos, conviene desactivarlo.', { name: deleting?.name })}
        onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)} />
    </>
  )
}
