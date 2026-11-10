import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Download, Plus } from 'lucide-react'
import { inventoryApi, warehousesApi } from '@/api/endpoints'
import type { Movement, MovementType } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Badge, Button, EmptyState, ErrorState, PageHeader, Pagination, Select, Spinner, Table, Td, Th } from '@/components/ui'
import { downloadCsv } from '@/lib/csv'
import { handleApiError } from '@/lib/errors'
import { formatDateTime, formatNumber } from '@/lib/format'
import { MOVEMENT_LABELS } from './labels'
import { MovementForm } from './MovementForm'
import { useTranslation } from 'react-i18next'

const TONES: Record<MovementType, 'green' | 'red' | 'amber' | 'blue'> = {
  IN: 'green', OUT: 'red', ADJUSTMENT: 'amber', TRANSFER_OUT: 'blue', TRANSFER_IN: 'blue',
}

export default function MovementsPage() {
  const { t } = useTranslation()
  const { can } = useAuth()
  const [type, setType] = useState<MovementType | undefined>()
  const [warehouseId, setWarehouseId] = useState<number | undefined>()
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const warehouses = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list })
  const query = { type, warehouseId, page, size: 25 }
  const list = useQuery({
    queryKey: ['inventory', 'movements', query],
    queryFn: () => inventoryApi.movements(query),
    placeholderData: keepPreviousData,
  })

  const exportCsv = async () => {
    setExporting(true)
    try {
      const rows: Movement[] = []
      for (let p = 0; ; p++) {
        const res = await inventoryApi.movements({ type, warehouseId, page: p, size: 100 })
        rows.push(...res.content)
        if (p + 1 >= res.totalPages) break
      }
      downloadCsv('movimientos.csv',
        [t('Fecha'), t('Tipo'), 'SKU', t('Producto'), t('Almacén'), t('Cantidad'), t('Unidad'), t('Saldo'), t('Motivo'), t('Referencia'), t('Usuario')],
        rows.map((m) => [m.createdAt, t(MOVEMENT_LABELS[m.type]), m.product.sku, m.product.name, m.warehouse.name,
          m.quantity, m.product.unitCode, m.balanceAfter, m.reason, m.reference, m.createdBy]))
    } catch (e) {
      handleApiError(e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <PageHeader title={t('Movimientos')} description={t('Historial inmutable de entradas, salidas, ajustes y transferencias.')}
        actions={<>
          <Button variant="secondary" loading={exporting} onClick={() => void exportCsv()} icon={<Download className="h-4 w-4" />}>{t('CSV')}</Button>
          {can('inventory:write') && <Button onClick={() => setFormOpen(true)} icon={<Plus className="h-4 w-4" />}>{t('Registrar movimiento')}</Button>}
        </>} />

      <div className="mb-6 flex flex-wrap gap-3">
        <Select aria-label={t('Tipo')} className="sm:w-auto" value={type ?? ''} onChange={(e) => { setType((e.target.value || undefined) as MovementType | undefined); setPage(0) }}>
          <option value="">{t('Todos los tipos')}</option>
          {(Object.keys(MOVEMENT_LABELS) as MovementType[]).map((type) => <option key={type} value={type}>{t(MOVEMENT_LABELS[type])}</option>)}
        </Select>
        <Select aria-label={t('Almacén')} className="sm:w-auto" value={warehouseId ?? ''} onChange={(e) => { setWarehouseId(e.target.value ? Number(e.target.value) : undefined); setPage(0) }}>
          <option value="">{t('Todos los almacenes')}</option>
          {warehouses.data?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </Select>
      </div>

      {list.isPending ? <Spinner /> : list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> :
        list.data.content.length === 0 ? <EmptyState title={t('No hay movimientos')} /> : (
          <>
            <Table>
              <thead>
                <tr><Th>{t('Fecha')}</Th><Th>{t('Tipo')}</Th><Th>{t('Producto')}</Th><Th>{t('Almacén')}</Th><Th className="text-right">{t('Cantidad')}</Th>
                  <Th className="text-right">{t('Saldo')}</Th><Th>{t('Motivo / referencia')}</Th><Th>{t('Usuario')}</Th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {list.data.content.map((m) => {
                  const d = m.product.unitDecimals
                  return (
                    <tr key={m.id}>
                      <Td className="whitespace-nowrap text-xs">{formatDateTime(m.createdAt)}</Td>
                      <Td><Badge tone={TONES[m.type]}>{MOVEMENT_LABELS[m.type]}</Badge></Td>
                      <Td><div className="font-medium">{m.product.name}</div><div className="font-mono text-xs text-gray-500">{m.product.sku}</div></Td>
                      <Td>{m.warehouse.name}</Td>
                      <Td className={`whitespace-nowrap text-right font-semibold ${m.quantity > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {m.quantity > 0 ? '+' : ''}{formatNumber(m.quantity, d)} {m.product.unitCode}
                      </Td>
                      <Td className="text-right">{formatNumber(m.balanceAfter, d)}</Td>
                      <Td><div>{m.reason ?? '—'}</div>{m.reference && <div className="text-xs text-gray-500">{m.reference}</div>}</Td>
                      <Td>{m.createdBy ?? '—'}</Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
            <Pagination page={list.data.page} totalPages={list.data.totalPages} totalElements={list.data.totalElements} onChange={setPage} />
          </>
        )}
      <MovementForm open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  )
}
