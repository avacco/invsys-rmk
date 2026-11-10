import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { AlertTriangle, ArrowLeftRight, DollarSign, Package, Truck, Warehouse, type LucideIcon } from 'lucide-react'
import { inventoryApi, productsApi, suppliersApi } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthContext'
import { Badge, Card, PageHeader } from '@/components/ui'
import { formatDateTime, formatMoney, formatNumber } from '@/lib/format'
import { MOVEMENT_LABELS } from '@/features/inventory/labels'

function Kpi({ label, value, icon: Icon, to, tone = 'blue' }: { label: string; value?: string | number; icon: LucideIcon; to: string; tone?: 'blue' | 'amber' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
  }
  return (
    <Link to={to}>
      <Card className="flex items-center gap-4 p-5 transition-shadow hover:shadow-md">
        <div className={`rounded-lg p-3 ${tones[tone]}`}><Icon className="h-6 w-6" /></div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-semibold">{value ?? '…'}</p>
        </div>
      </Card>
    </Link>
  )
}

export default function HomePage() {
  const { user, can } = useAuth()
  const canInventory = can('inventory:read')
  const canCatalog = can('catalog:read')
  const canPartners = can('partners:read')

  const summary = useQuery({ queryKey: ['inventory', 'summary'], queryFn: inventoryApi.summary, enabled: canInventory })
  const low = useQuery({ queryKey: ['inventory', 'stock', 'low-home'], enabled: canInventory,
    queryFn: () => inventoryApi.stock({ lowOnly: true, size: 5, sort: 'name' }) })
  const recent = useQuery({ queryKey: ['inventory', 'movements', 'recent'], enabled: canInventory,
    queryFn: () => inventoryApi.movements({ size: 6 }) })
  const products = useQuery({ queryKey: ['products', 'count', 'ACTIVE'], enabled: canCatalog,
    queryFn: () => productsApi.list({ status: 'ACTIVE', size: 1 }) })
  const suppliers = useQuery({ queryKey: ['suppliers', 'count'], enabled: canPartners,
    queryFn: () => suppliersApi.list({ active: true, size: 1 }) })

  const s = summary.data
  return (
    <>
      <PageHeader title={`Hola, ${user?.displayName ?? ''}`} description="Resumen del inventario." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {canInventory && <Kpi label="Valor del inventario (al costo)" value={s && formatMoney(s.inventoryValue)} icon={DollarSign} to="/inventory" />}
        {canInventory && <Kpi label="Productos con stock bajo" value={s?.lowStockProducts} icon={AlertTriangle} to="/inventory" tone={s && s.lowStockProducts > 0 ? 'amber' : 'blue'} />}
        {canInventory && <Kpi label="Movimientos (7 días)" value={s?.movementsLast7Days} icon={ArrowLeftRight} to="/inventory/movements" />}
        {canInventory && <Kpi label="Almacenes activos" value={s?.activeWarehouses} icon={Warehouse} to="/warehouses" />}
        {canCatalog && <Kpi label="Productos activos" value={products.data?.totalElements} icon={Package} to="/products" />}
        {canPartners && <Kpi label="Proveedores activos" value={suppliers.data?.totalElements} icon={Truck} to="/suppliers" />}
      </div>

      {canInventory && (
        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Stock bajo</h2>
              <Link to="/inventory" className="text-blue-600 hover:underline dark:text-blue-400">Ver stock</Link>
            </div>
            {low.data?.content.length === 0 && <p className="text-gray-500">Todos los productos están por encima del mínimo.</p>}
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {low.data?.content.map((r) => (
                <li key={r.product.id} className="flex items-center justify-between py-2">
                  <span><span className="font-medium">{r.product.name}</span> <span className="font-mono text-xs text-gray-500">{r.product.sku}</span></span>
                  <Badge tone="amber">{formatNumber(r.total, r.product.unitDecimals)} / {formatNumber(r.minStock, r.product.unitDecimals)} {r.product.unitCode}</Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Últimos movimientos</h2>
              <Link to="/inventory/movements" className="text-blue-600 hover:underline dark:text-blue-400">Ver todos</Link>
            </div>
            {recent.data?.content.length === 0 && <p className="text-gray-500">Todavía no hay movimientos.</p>}
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {recent.data?.content.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{MOVEMENT_LABELS[m.type]}</span> · {m.product.name} · {m.warehouse.name}
                    <span className="block text-xs text-gray-500">{formatDateTime(m.createdAt)} · {m.createdBy}</span>
                  </span>
                  <span className={`whitespace-nowrap font-semibold ${m.quantity > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {m.quantity > 0 ? '+' : ''}{formatNumber(m.quantity, m.product.unitDecimals)} {m.product.unitCode}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  )
}
