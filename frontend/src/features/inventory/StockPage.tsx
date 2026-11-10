import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, Plus } from 'lucide-react'
import { categoriesApi, inventoryApi, warehousesApi } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthContext'
import { Badge, Button, EmptyState, ErrorState, PageHeader, Pagination, SearchInput, Select, Spinner, Table, Td, Th } from '@/components/ui'
import { formatNumber } from '@/lib/format'
import { useDebounce } from '@/lib/useDebounce'
import { MovementForm } from './MovementForm'
import { useTranslation } from 'react-i18next'

export default function StockPage() {
  const { t } = useTranslation()
  const { can } = useAuth()
  const canWrite = can('inventory:write')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [lowOnly, setLowOnly] = useState(false)
  const [page, setPage] = useState(0)
  const q = useDebounce(search)

  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, enabled: can('catalog:read') })
  const warehouses = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list })
  const stock = useQuery({
    queryKey: ['inventory', 'stock', { q, categoryId, lowOnly, page }],
    queryFn: () => inventoryApi.stock({ q, categoryId, lowOnly, page, size: 20, sort: 'name' }),
    placeholderData: keepPreviousData,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [formProduct, setFormProduct] = useState<number | undefined>()
  const openForm = (productId?: number) => {
    setFormProduct(productId)
    setFormOpen(true)
  }

  // Columnas: almacenes activos, más los inactivos que todavía tienen stock en la página.
  const columns = (warehouses.data ?? []).filter((w) =>
    w.active || stock.data?.content.some((r) => r.levels.some((l) => l.warehouse.id === w.id && l.quantity !== 0)))

  return (
    <>
      <PageHeader title={t('Stock')} description={t('Existencias por almacén, calculadas a partir de los movimientos.')}
        actions={canWrite && <Button onClick={() => openForm()} icon={<Plus className="h-4 w-4" />}>{t('Registrar movimiento')}</Button>} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder={t('Buscar por nombre o SKU')} />
        {categories.data && (
          <Select aria-label={t('Categoría')} className="sm:w-auto" value={categoryId ?? ''}
            onChange={(e) => { setCategoryId(e.target.value ? Number(e.target.value) : undefined); setPage(0) }}>
            <option value="">{t('Todas las categorías')}</option>
            {categories.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}
        <label className="flex cursor-pointer items-center gap-2 font-medium">
          <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={lowOnly} onChange={(e) => { setLowOnly(e.target.checked); setPage(0) }} />
          {t('Solo stock bajo')}
        </label>
      </div>

      {stock.isPending ? <Spinner /> : stock.isError ? <ErrorState error={stock.error} onRetry={() => void stock.refetch()} /> :
        stock.data.content.length === 0 ? (
          <EmptyState title={lowOnly ? t('Ningún producto está por debajo del mínimo') : t('No hay productos activos')} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{t('Producto')}</Th>
                  {columns.map((w) => <Th key={w.id} className="text-right">{w.name}</Th>)}
                  <Th className="text-right">{t('Total')}</Th>
                  <Th className="text-right">{t('Mínimo')}</Th>
                  <Th>{t('Estado')}</Th>
                  {canWrite && <Th />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {stock.data.content.map((row) => {
                  const d = row.product.unitDecimals
                  return (
                    <tr key={row.product.id}>
                      <Td>
                        <div className="font-medium">{row.product.name}</div>
                        <div className="font-mono text-xs text-gray-500">{row.product.sku}</div>
                      </Td>
                      {columns.map((w) => {
                        const qty = row.levels.find((l) => l.warehouse.id === w.id)?.quantity ?? 0
                        return <Td key={w.id} className={`text-right ${qty === 0 ? 'text-gray-400' : ''}`}>{formatNumber(qty, d)}</Td>
                      })}
                      <Td className="text-right font-semibold">{formatNumber(row.total, d)} {row.product.unitCode}</Td>
                      <Td className="text-right text-gray-500">{formatNumber(row.minStock, d)}</Td>
                      <Td>{row.low ? <Badge tone="amber">{t('Stock bajo')}</Badge> : row.total === 0 ? <Badge>{t('Sin stock')}</Badge> : <Badge tone="green">{t('OK')}</Badge>}</Td>
                      {canWrite && (
                        <Td>
                          <Button variant="ghost" className="px-2" aria-label={t('Registrar movimiento de {{name}}', { name: row.product.name })}
                            onClick={() => openForm(row.product.id)} icon={<ArrowLeftRight className="h-4 w-4" />} />
                        </Td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </Table>
            <Pagination page={stock.data.page} totalPages={stock.data.totalPages} totalElements={stock.data.totalElements} onChange={setPage} />
          </>
        )}

      <MovementForm open={formOpen} initialProductId={formProduct} onClose={() => setFormOpen(false)} />
    </>
  )
}
