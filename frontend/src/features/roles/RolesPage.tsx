import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Plus } from 'lucide-react'
import { rolesApi } from '@/api/endpoints'
import type { PermissionInfo, PermissionValue, Role } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { RowActions } from '@/components/RowActions'
import { Badge, Button, Card, ConfirmDialog, ErrorState, Field, Input, Modal, PageHeader, Spinner } from '@/components/ui'
import { handleApiError } from '@/lib/errors'
import { toast } from '@/store/toast'

const RESOURCE_LABELS: Record<string, string> = {
  catalog: 'Catálogo', inventory: 'Inventario', partners: 'Proveedores', users: 'Usuarios', roles: 'Roles',
}
const OPERATION_LABELS: Record<string, string> = { read: 'Ver', write: 'Editar' }

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(50).regex(/^[A-Z0-9_]+$/, 'Mayúsculas, números y guion bajo'),
  description: z.string().max(255),
  permissions: z.array(z.string()),
})
type Values = z.infer<typeof schema>

function groupByResource(perms: PermissionInfo[]) {
  const groups = new Map<string, PermissionInfo[]>()
  for (const p of perms) groups.set(p.resource, [...(groups.get(p.resource) ?? []), p])
  return [...groups.entries()]
}

function RoleForm({ open, role, permissions, onClose }: { open: boolean; role: Role | null; permissions: PermissionInfo[]; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (open) reset({ name: role?.name ?? '', description: role?.description ?? '', permissions: role?.permissions ?? [] })
  }, [open, role, reset])
  const save = useMutation({
    mutationFn: (v: Values) => {
      const body = { name: v.name, description: v.description.trim() || null, permissions: v.permissions as PermissionValue[] }
      return role ? rolesApi.update(role.id, body) : rolesApi.create(body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })
  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(v)
      toast.success(role ? 'Rol actualizado' : 'Rol creado')
      onClose()
    } catch (e) {
      handleApiError(e, setError)
    }
  })
  return (
    <Modal open={open} title={role ? `Editar rol ${role.name}` : 'Nuevo rol'} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="role-form" loading={save.isPending}>Guardar</Button></>}>
      <form id="role-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Nombre" htmlFor="r-name" error={errors.name?.message}><Input id="r-name" placeholder="AUDITOR" {...register('name')} /></Field>
        <Field label="Descripción" htmlFor="r-desc" error={errors.description?.message}><Input id="r-desc" {...register('description')} /></Field>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Permisos</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {groupByResource(permissions).map(([resource, perms]) => (
              <div key={resource} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="mb-2 font-medium">{RESOURCE_LABELS[resource] ?? resource}</p>
                {perms.map((p) => (
                  <label key={p.value} className="flex items-center gap-2 py-0.5">
                    <input type="checkbox" value={p.value} className="h-4 w-4 accent-blue-600" {...register('permissions')} />
                    {OPERATION_LABELS[p.value.split(':')[1]] ?? p.value}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}

export default function RolesPage() {
  const { can } = useAuth()
  const canWrite = can('roles:write')
  const qc = useQueryClient()
  const roles = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list })
  const permissions = useQuery({ queryKey: ['permissions'], queryFn: rolesApi.permissions })
  const [editing, setEditing] = useState<Role | null>(null)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<Role | null>(null)
  const remove = useMutation({ mutationFn: rolesApi.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }) })

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Rol eliminado')
    } catch (e) {
      handleApiError(e)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <PageHeader title="Roles y permisos" description="Cada usuario tiene un rol; el rol define qué puede ver y editar."
        actions={canWrite && <Button onClick={() => { setEditing(null); setOpen(true) }} icon={<Plus className="h-4 w-4" />}>Nuevo rol</Button>} />
      {roles.isPending ? <Spinner /> : roles.isError ? <ErrorState error={roles.error} onRetry={() => void roles.refetch()} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.data.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold">{r.name}{r.system && <Lock className="h-4 w-4 text-gray-400" aria-label="Rol de sistema" />}</h3>
                  <p className="text-gray-500 dark:text-gray-400">{r.description ?? '—'}</p>
                </div>
                {canWrite && !r.system && <RowActions label={r.name} onEdit={() => { setEditing(r); setOpen(true) }} onDelete={() => setDeleting(r)} />}
              </div>
              <div className="flex flex-wrap gap-1">
                {r.permissions.length === 0 ? <span className="text-gray-400">Sin permisos</span> :
                  r.permissions.map((p) => <Badge key={p} tone="blue">{p}</Badge>)}
              </div>
            </Card>
          ))}
        </div>
      )}
      <RoleForm open={open} role={editing} permissions={permissions.data ?? []} onClose={() => setOpen(false)} />
      <ConfirmDialog open={deleting !== null} title="Eliminar rol" loading={remove.isPending}
        message={<>¿Eliminar el rol <strong>{deleting?.name}</strong>?</>}
        onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)} />
    </>
  )
}
