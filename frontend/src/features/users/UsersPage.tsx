import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { rolesApi, usersApi } from '@/api/endpoints'
import type { User } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { RowActions } from '@/components/RowActions'
import { Badge, Button, ConfirmDialog, ErrorState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, Table, Td, Th } from '@/components/ui'
import { handleApiError } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { toast } from '@/store/toast'

const base = {
  displayName: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  email: z.union([z.literal(''), z.string().trim().email('Email inválido').max(255)]),
  roleId: z.number({ invalid_type_error: 'Elegí un rol' }).int().positive('Elegí un rol'),
  enabled: z.boolean(),
}
const createSchema = z.object({
  ...base,
  username: z.string().trim().min(3, 'Mínimo 3 caracteres').max(50).regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, punto, guion y guion bajo'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72),
})
const updateSchema = z.object({
  ...base,
  username: z.string(),
  password: z.union([z.literal(''), z.string().min(8, 'Mínimo 8 caracteres').max(72)]),
})
type Values = z.infer<typeof createSchema>

function UserForm({ open, user, onClose }: { open: boolean; user: User | null; onClose: () => void }) {
  const qc = useQueryClient()
  const roles = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list })
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(user ? updateSchema : createSchema) as never,
  })
  useEffect(() => {
    if (!open) return
    reset({
      username: user?.username ?? '', displayName: user?.displayName ?? '', email: user?.email ?? '', password: '',
      roleId: user?.role.id ?? roles.data?.[0]?.id ?? 0, enabled: user?.enabled ?? true,
    })
  }, [open, user, roles.data, reset])
  const save = useMutation({
    mutationFn: (v: Values) => {
      const email = v.email.trim() || null
      return user
        ? usersApi.update(user.id, { displayName: v.displayName, email, roleId: v.roleId, enabled: v.enabled, password: v.password || null })
        : usersApi.create({ username: v.username, displayName: v.displayName, email, roleId: v.roleId, enabled: v.enabled, password: v.password })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(v)
      toast.success(user ? 'Usuario actualizado' : 'Usuario creado')
      onClose()
    } catch (e) {
      handleApiError(e, setError)
    }
  })
  return (
    <Modal open={open} title={user ? `Editar ${user.username}` : 'Nuevo usuario'} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="user-form" loading={save.isPending}>Guardar</Button></>}>
      <form id="user-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Usuario" htmlFor="u-username" error={errors.username?.message}>
          <Input id="u-username" autoComplete="off" disabled={!!user} {...register('username')} />
        </Field>
        <Field label="Nombre visible" htmlFor="u-name" error={errors.displayName?.message}><Input id="u-name" {...register('displayName')} /></Field>
        <Field label="Email" htmlFor="u-email" error={errors.email?.message} className="sm:col-span-2"><Input id="u-email" type="email" {...register('email')} /></Field>
        <Field label={user ? 'Nueva contraseña (opcional)' : 'Contraseña'} htmlFor="u-pass" error={errors.password?.message} className="sm:col-span-2">
          <Input id="u-pass" type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <Field label="Rol" htmlFor="u-role" error={errors.roleId?.message}>
          <Select id="u-role" {...register('roleId', { valueAsNumber: true })}>
            {roles.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
        <Field label="Estado" htmlFor="u-enabled">
          <Select id="u-enabled" {...register('enabled', { setValueAs: (v) => v === true || v === 'true' })}>
            <option value="true">Habilitado</option>
            <option value="false">Deshabilitado</option>
          </Select>
        </Field>
      </form>
    </Modal>
  )
}

export default function UsersPage() {
  const { can, user: me } = useAuth()
  const canWrite = can('users:write')
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const list = useQuery({ queryKey: ['users', page], queryFn: () => usersApi.list({ page, size: 20 }), placeholderData: keepPreviousData })
  const [editing, setEditing] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<User | null>(null)
  const remove = useMutation({ mutationFn: usersApi.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) })

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Usuario eliminado')
    } catch (e) {
      handleApiError(e)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <PageHeader title="Usuarios" description="Personas con acceso al sistema y su rol."
        actions={canWrite && <Button onClick={() => { setEditing(null); setOpen(true) }} icon={<Plus className="h-4 w-4" />}>Nuevo usuario</Button>} />
      {list.isPending ? <Spinner /> : list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : (
        <>
          <Table>
            <thead><tr><Th>Usuario</Th><Th>Nombre</Th><Th>Rol</Th><Th>Estado</Th><Th>Alta</Th>{canWrite && <Th />}</tr></thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {list.data.content.map((u) => (
                <tr key={u.id}>
                  <Td className="font-mono">{u.username}</Td>
                  <Td>{u.displayName}<div className="text-xs text-gray-500">{u.email}</div></Td>
                  <Td><Badge tone="blue">{u.role.name}</Badge></Td>
                  <Td>{u.enabled ? <Badge tone="green">Habilitado</Badge> : <Badge tone="red">Deshabilitado</Badge>}</Td>
                  <Td className="text-xs">{formatDateTime(u.audit.createdAt)}</Td>
                  {canWrite && <Td><RowActions label={u.username} onEdit={() => { setEditing(u); setOpen(true) }}
                    onDelete={u.id === me?.id ? undefined : () => setDeleting(u)} /></Td>}
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={list.data.page} totalPages={list.data.totalPages} totalElements={list.data.totalElements} onChange={setPage} />
        </>
      )}
      <UserForm open={open} user={editing} onClose={() => setOpen(false)} />
      <ConfirmDialog open={deleting !== null} title="Eliminar usuario" loading={remove.isPending}
        message={<>¿Eliminar al usuario <strong>{deleting?.username}</strong>?</>}
        onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)} />
    </>
  )
}
