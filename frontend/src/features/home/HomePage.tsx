import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Boxes, Package, PackageX, Truck, type LucideIcon } from 'lucide-react'
import { categoriesApi, productsApi, suppliersApi } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthContext'
import { Card, PageHeader } from '@/components/ui'

function Kpi({ label, value, icon: Icon, to }: { label: string; value?: number; icon: LucideIcon; to: string }) {
  return (
    <Link to={to}>
      <Card className="flex items-center gap-4 p-5 transition-shadow hover:shadow-md">
        <div className="rounded-lg bg-blue-50 p-3 text-blue-600 dark:bg-blue-950 dark:text-blue-300"><Icon className="h-6 w-6" /></div>
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
  const canCatalog = can('catalog:read')
  const canPartners = can('partners:read')

  const active = useQuery({ queryKey: ['products', 'count', 'ACTIVE'], enabled: canCatalog,
    queryFn: () => productsApi.list({ status: 'ACTIVE', size: 1 }) })
  const inactive = useQuery({ queryKey: ['products', 'count', 'INACTIVE'], enabled: canCatalog,
    queryFn: () => productsApi.list({ status: 'INACTIVE', size: 1 }) })
  const categories = useQuery({ queryKey: ['categories'], enabled: canCatalog, queryFn: categoriesApi.list })
  const suppliers = useQuery({ queryKey: ['suppliers', 'count'], enabled: canPartners,
    queryFn: () => suppliersApi.list({ active: true, size: 1 }) })

  return (
    <>
      <PageHeader title={`Hola, ${user?.displayName ?? ''}`} description="Resumen del catálogo." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {canCatalog && <Kpi label="Productos activos" value={active.data?.totalElements} icon={Package} to="/products" />}
        {canCatalog && <Kpi label="Productos inactivos" value={inactive.data?.totalElements} icon={PackageX} to="/products" />}
        {canCatalog && <Kpi label="Categorías" value={categories.data?.length} icon={Boxes} to="/catalog" />}
        {canPartners && <Kpi label="Proveedores activos" value={suppliers.data?.totalElements} icon={Truck} to="/suppliers" />}
      </div>
      <Card className="mt-8 p-6">
        <h2 className="mb-2 text-lg font-semibold">Próximamente</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Stock por almacén basado en movimientos (entradas, salidas, ajustes y transferencias), alertas de stock bajo,
          dashboard con valor del inventario y registro de auditoría.
        </p>
      </Card>
    </>
  )
}
