import { useState } from 'react'
import { Download, LayoutGrid, List, Plus } from 'lucide-react'
import { productsApi } from '@/api/endpoints'
import type { Product, ProductQuery, ProductStatus } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Button, ConfirmDialog, EmptyState, ErrorState, PageHeader, Pagination, SearchInput, Select, Spinner } from '@/components/ui'
import { downloadCsv } from '@/lib/csv'
import { handleApiError } from '@/lib/errors'
import { useDebounce } from '@/lib/useDebounce'
import { useUi } from '@/store/ui'
import { toast } from '@/store/toast'
import { ProductForm } from './ProductForm'
import { ProductGrid, ProductTable } from './ProductViews'
import { useCatalogOptions, useDeleteProduct, useProductList } from './useProducts'

const SORTS = [
  { value: 'name,asc', label: 'Nombre (A-Z)' },
  { value: 'name,desc', label: 'Nombre (Z-A)' },
  { value: 'salePrice,asc', label: 'Precio (menor)' },
  { value: 'salePrice,desc', label: 'Precio (mayor)' },
  { value: 'updatedAt,desc', label: 'Última modificación' },
]

export default function ProductsPage() {
  const { can } = useAuth()
  const canWrite = can('catalog:write')
  const { productView, setProductView } = useUi()
  const { categories, units, suppliers } = useCatalogOptions(can('partners:read'))

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [supplierId, setSupplierId] = useState<number | undefined>()
  const [status, setStatus] = useState<ProductStatus | undefined>()
  const [sort, setSort] = useState(SORTS[0].value)
  const [page, setPage] = useState(0)
  const q = useDebounce(search)

  const query: ProductQuery = { q, categoryId, supplierId, status, sort, page, size: 12 }
  const list = useProductList(query)
  const remove = useDeleteProduct()

  const [editing, setEditing] = useState<Product | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [exporting, setExporting] = useState(false)

  const filter = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setPage(0)
  }

  const openForm = (product: Product | null) => {
    setEditing(product)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Producto eliminado')
      setDeleting(null)
    } catch (e) {
      handleApiError(e)
    }
  }

  /** Exporta todos los productos que cumplen los filtros actuales, no solo la página visible. */
  const exportCsv = async () => {
    setExporting(true)
    try {
      const rows: Product[] = []
      for (let p = 0; ; p++) {
        const res = await productsApi.list({ ...query, page: p, size: 100 })
        rows.push(...res.content)
        if (p + 1 >= res.totalPages) break
      }
      downloadCsv('productos.csv',
        ['SKU', 'Nombre', 'Categoría', 'Proveedor', 'Unidad', 'Costo', 'Precio de venta', 'Stock mínimo', 'Estado', 'Descripción'],
        rows.map((r) => [r.sku, r.name, r.category?.name, r.supplier?.name, r.unit.code, r.costPrice, r.salePrice,
          r.minStock, r.status === 'ACTIVE' ? 'Activo' : 'Inactivo', r.description]))
    } catch (e) {
      handleApiError(e)
    } finally {
      setExporting(false)
    }
  }

  const data = list.data
  return (
    <>
      <PageHeader
        title="Productos"
        description="Catálogo de productos con precios, categoría y proveedor."
        actions={<>
          <Button variant="secondary" loading={exporting} onClick={() => void exportCsv()} icon={<Download className="h-4 w-4" />}>CSV</Button>
          {canWrite && <Button onClick={() => openForm(null)} icon={<Plus className="h-4 w-4" />}>Nuevo producto</Button>}
        </>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={filter(setSearch)} placeholder="Buscar por nombre o SKU" />
        <Select aria-label="Categoría" className="sm:w-auto" value={categoryId ?? ''} onChange={(e) => filter(setCategoryId)(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        {suppliers.length > 0 && (
          <Select aria-label="Proveedor" className="sm:w-auto" value={supplierId ?? ''} onChange={(e) => filter(setSupplierId)(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Todos los proveedores</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        )}
        <Select aria-label="Estado" className="sm:w-auto" value={status ?? ''} onChange={(e) => filter(setStatus)((e.target.value || undefined) as ProductStatus | undefined)}>
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activos</option>
          <option value="INACTIVE">Inactivos</option>
        </Select>
        <Select aria-label="Ordenar" className="sm:w-auto" value={sort} onChange={(e) => filter(setSort)(e.target.value)}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <div className="ml-auto flex gap-1">
          <Button variant={productView === 'grid' ? 'secondary' : 'ghost'} className="px-2" aria-label="Vista de tarjetas" onClick={() => setProductView('grid')} icon={<LayoutGrid className="h-4 w-4" />} />
          <Button variant={productView === 'table' ? 'secondary' : 'ghost'} className="px-2" aria-label="Vista de tabla" onClick={() => setProductView('table')} icon={<List className="h-4 w-4" />} />
        </div>
      </div>

      {list.isPending ? <Spinner /> : list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> :
        data && data.content.length === 0 ? (
          <EmptyState title="No hay productos" description={q || categoryId || supplierId || status ? 'Probá con otros filtros.' : undefined}
            action={canWrite && !q && <Button onClick={() => openForm(null)}>Crear el primero</Button>} />
        ) : data && (
          <>
            {productView === 'grid'
              ? <ProductGrid products={data.content} canWrite={canWrite} onEdit={openForm} onDelete={setDeleting} />
              : <ProductTable products={data.content} canWrite={canWrite} onEdit={openForm} onDelete={setDeleting} />}
            <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
          </>
        )}

      <ProductForm open={formOpen} product={editing} categories={categories} units={units} suppliers={suppliers} onClose={() => setFormOpen(false)} />
      <ConfirmDialog open={deleting !== null} title="Eliminar producto" loading={remove.isPending}
        message={<>¿Eliminar <strong>{deleting?.name}</strong>? Esta acción no se puede deshacer.</>}
        onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)} />
    </>
  )
}
