import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { auditApi } from '@/api/endpoints'
import type { AuditAction, AuditEntry, AuditQuery } from '@/api/types'
import { Badge, Button, EmptyState, ErrorState, Field, Input, PageHeader, Pagination, SearchInput, Select, Spinner, Table, Td, Th } from '@/components/ui'
import { downloadCsv } from '@/lib/csv'
import { handleApiError } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { useDebounce } from '@/lib/useDebounce'
import { ACTION_LABELS, ACTION_TONES, ENTITY_LABELS, formatSummary } from './labels'

/** "2026-11-10" (fecha local) → instante ISO del inicio de ese día local. */
const startOfLocalDay = (date: string, plusDays = 0) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d + plusDays).toISOString()
}

export default function AuditPage() {
  const [search, setSearch] = useState('')
  const [actor, setActor] = useState('')
  const [action, setAction] = useState<AuditAction | undefined>()
  const [entityType, setEntityType] = useState<string | undefined>()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [exporting, setExporting] = useState(false)
  const q = useDebounce(search)
  const actorQ = useDebounce(actor)

  const filters: AuditQuery = {
    q, actor: actorQ.trim() || undefined, action, entityType,
    from: from ? startOfLocalDay(from) : undefined,
    to: to ? startOfLocalDay(to, 1) : undefined,
  }
  const list = useQuery({
    queryKey: ['audit', filters, page],
    queryFn: () => auditApi.list({ ...filters, page, size: 25 }),
    placeholderData: keepPreviousData,
  })
  const reset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(0) }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const rows: AuditEntry[] = []
      for (let p = 0; ; p++) {
        const res = await auditApi.list({ ...filters, page: p, size: 100 })
        rows.push(...res.content)
        if (p + 1 >= res.totalPages) break
      }
      downloadCsv('auditoria.csv', ['Fecha', 'Usuario', 'Acción', 'Entidad', 'ID', 'Detalle'],
        rows.map((e) => [e.occurredAt, e.actor, ACTION_LABELS[e.action], e.entityType && (ENTITY_LABELS[e.entityType] ?? e.entityType),
          e.entityId, formatSummary(e.action, e.summary)]))
    } catch (e) {
      handleApiError(e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <PageHeader title="Auditoría" description="Registro de quién hizo cada cambio y cuándo. Solo se registran los cambios confirmados."
        actions={<Button variant="secondary" loading={exporting} onClick={() => void exportCsv()} icon={<Download className="h-4 w-4" />}>CSV</Button>} />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <SearchInput value={search} onChange={reset(setSearch)} placeholder="Buscar en el detalle" />
        <Field label="Usuario" htmlFor="a-actor">
          <Input id="a-actor" className="sm:w-40" value={actor} onChange={(e) => reset(setActor)(e.target.value)} />
        </Field>
        <Field label="Acción" htmlFor="a-action">
          <Select id="a-action" className="sm:w-auto" value={action ?? ''} onChange={(e) => reset(setAction)((e.target.value || undefined) as AuditAction | undefined)}>
            <option value="">Todas</option>
            {(Object.keys(ACTION_LABELS) as AuditAction[]).map((a) => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
          </Select>
        </Field>
        <Field label="Entidad" htmlFor="a-entity">
          <Select id="a-entity" className="sm:w-auto" value={entityType ?? ''} onChange={(e) => reset(setEntityType)(e.target.value || undefined)}>
            <option value="">Todas</option>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Desde" htmlFor="a-from"><Input id="a-from" type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} /></Field>
        <Field label="Hasta" htmlFor="a-to"><Input id="a-to" type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} /></Field>
      </div>

      {list.isPending ? <Spinner /> : list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> :
        list.data.content.length === 0 ? <EmptyState title="No hay registros para estos filtros" /> : (
          <>
            <Table>
              <thead><tr><Th>Fecha</Th><Th>Usuario</Th><Th>Acción</Th><Th>Entidad</Th><Th>Detalle</Th></tr></thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {list.data.content.map((e) => (
                  <tr key={e.id}>
                    <Td className="whitespace-nowrap text-xs">{formatDateTime(e.occurredAt)}</Td>
                    <Td className="font-mono">{e.actor ?? '—'}</Td>
                    <Td><Badge tone={ACTION_TONES[e.action]}>{ACTION_LABELS[e.action]}</Badge></Td>
                    <Td>{e.entityType ? `${ENTITY_LABELS[e.entityType] ?? e.entityType}${e.entityId ? ` #${e.entityId}` : ''}` : '—'}</Td>
                    <Td>{formatSummary(e.action, e.summary)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={list.data.page} totalPages={list.data.totalPages} totalElements={list.data.totalElements} onChange={setPage} />
          </>
        )}
    </>
  )
}
