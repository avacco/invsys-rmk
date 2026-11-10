import { Pencil, Trash2 } from 'lucide-react'
import type { Product } from '@/api/types'
import { Badge, Button, Card, Table, Td, Th } from '@/components/ui'
import { formatMoney, formatNumber } from '@/lib/format'
import { safeImageUrl } from '@/lib/url'
import placeholder from '@/assets/product-placeholder.png'
import { useTranslation } from 'react-i18next'

interface ViewProps {
  products: Product[]
  canWrite: boolean
  onEdit: (p: Product) => void
  onDelete: (p: Product) => void
}

function StatusBadge({ status }: { status: Product['status'] }) {
  const { t } = useTranslation()
  return status === 'ACTIVE' ? <Badge tone="green">{t('Activo')}</Badge> : <Badge>{t('Inactivo')}</Badge>
}

function Actions({ product, onEdit, onDelete }: { product: Product; onEdit: ViewProps['onEdit']; onDelete: ViewProps['onDelete'] }) {
  const { t } = useTranslation()
  return (
    <div className="flex gap-1">
      <Button variant="ghost" className="px-2" aria-label={t('Editar {{name}}', { name: product.name })} onClick={() => onEdit(product)} icon={<Pencil className="h-4 w-4" />} />
      <Button variant="ghost" className="px-2 hover:text-red-600" aria-label={t('Eliminar {{name}}', { name: product.name })} onClick={() => onDelete(product)} icon={<Trash2 className="h-4 w-4" />} />
    </div>
  )
}

export function ProductGrid({ products, canWrite, onEdit, onDelete }: ViewProps) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {products.map((p) => (
        <Card key={p.id} className="flex flex-col overflow-hidden">
          <div className="flex h-40 items-center justify-center bg-gray-50 dark:bg-gray-900">
            <img src={safeImageUrl(p.imageUrl) || placeholder} alt="" className="h-full w-full object-contain p-2" loading="lazy" />
          </div>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{p.sku}</p>
                <h3 className="truncate font-semibold" title={p.name}>{p.name}</h3>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <p className="text-gray-500 dark:text-gray-400">{p.category?.name ?? 'Sin categoría'} · {p.unit.name}</p>
            {p.description && <p className="line-clamp-2 text-gray-600 dark:text-gray-300">{p.description}</p>}
            <div className="mt-auto flex items-end justify-between pt-2">
              <div>
                <p className="text-lg font-semibold">{formatMoney(p.salePrice)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Costo {{price}}', { price: formatMoney(p.costPrice) })}</p>
              </div>
              {canWrite && <Actions product={p} onEdit={onEdit} onDelete={onDelete} />}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export function ProductTable({ products, canWrite, onEdit, onDelete }: ViewProps) {
  const { t } = useTranslation()
  return (
    <Table>
      <thead>
        <tr>
          <Th>{t('SKU')}</Th><Th>{t('Nombre')}</Th><Th>{t('Categoría')}</Th><Th>{t('Proveedor')}</Th>
          <Th className="text-right">{t('Costo')}</Th><Th className="text-right">{t('Venta')}</Th><Th className="text-right">{t('Stock mín.')}</Th>
          <Th>{t('Estado')}</Th>{canWrite && <Th />}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
        {products.map((p) => (
          <tr key={p.id}>
            <Td className="font-mono text-xs">{p.sku}</Td>
            <Td className="font-medium">{p.name}</Td>
            <Td>{p.category?.name ?? '—'}</Td>
            <Td>{p.supplier?.name ?? '—'}</Td>
            <Td className="text-right">{formatMoney(p.costPrice)}</Td>
            <Td className="text-right">{formatMoney(p.salePrice)}</Td>
            <Td className="text-right">{formatNumber(p.minStock, p.unit.decimals)} {p.unit.code}</Td>
            <Td><StatusBadge status={p.status} /></Td>
            {canWrite && <Td><Actions product={p} onEdit={onEdit} onDelete={onDelete} /></Td>}
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
