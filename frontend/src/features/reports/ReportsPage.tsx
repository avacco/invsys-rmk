import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { reportsApi } from '@/api/endpoints'
import type { ValuationGroup } from '@/api/types'
import { Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td, Th } from '@/components/ui'
import { formatMoney, formatMoneyCompact, formatNumber, formatPercent } from '@/lib/format'
import { useChartTheme } from './chartTheme'
import { useTranslation } from 'react-i18next'

const PERIODS = [7, 30, 90]


const shortDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d))
}

function Section({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </Card>
  )
}

function Segmented<T extends string | number>({ value, options, onChange, label }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  const { t } = useTranslation()
  return (
    <div role="group" aria-label={t(label)} className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}
          className={`cursor-pointer rounded-md px-3 py-1 font-medium ${o.value === value ? 'bg-white shadow-sm dark:bg-gray-900' : 'text-gray-600 dark:text-gray-300'}`}>
          {t(o.label)}
        </button>
      ))}
    </div>
  )
}

/** Tooltip con los colores del tema; el texto usa tinta neutra y la muestra de color identifica la serie. */
function ChartTooltip({ active, payload, label, labelFormatter }: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
  labelFormatter?: (l: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-gray-600 dark:bg-gray-800">
      <p className="mb-1 font-semibold">{labelFormatter && label ? labelFormatter(label) : label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600 dark:text-gray-300">{p.name}:</span>
          <span className="font-medium">{formatMoney(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

function ActivityChart({ days }: { days: number }) {
  const { t } = useTranslation()
  const theme = useChartTheme()
  const activity = useQuery({ queryKey: ['reports', 'activity', days], queryFn: () => reportsApi.activity(days) })
  if (activity.isPending) return <Spinner />
  if (activity.isError) return <ErrorState error={activity.error} onRetry={() => void activity.refetch()} />
  const data = activity.data
  const totals = data.reduce((t, d) => ({ in: t.in + d.inValue, out: t.out + d.outValue, n: t.n + d.movements }), { in: 0, out: 0, n: 0 })
  return (
    <>
      <dl className="mb-4 grid grid-cols-3 gap-4">
        <div><dt className="text-gray-500 dark:text-gray-400">{t('Entradas')}</dt><dd className="text-xl font-semibold">{formatMoney(totals.in)}</dd></div>
        <div><dt className="text-gray-500 dark:text-gray-400">{t('Salidas')}</dt><dd className="text-xl font-semibold">{formatMoney(totals.out)}</dd></div>
        <div><dt className="text-gray-500 dark:text-gray-400">{t('Movimientos')}</dt><dd className="text-xl font-semibold">{totals.n}</dd></div>
      </dl>
      <div className="h-72" role="img" aria-label={t('Gráfico de barras: valor de entradas y salidas por día')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} barGap={2} barCategoryGap="20%">
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} stroke={theme.axis} tickLine={false} axisLine={false} minTickGap={24} fontSize={12} />
            <YAxis tickFormatter={formatMoneyCompact} stroke={theme.axis} tickLine={false} axisLine={false} width={56} fontSize={12} />
            <Tooltip content={<ChartTooltip labelFormatter={shortDate} />} cursor={{ fill: theme.grid, opacity: 0.4 }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: theme.text }} />
            <Bar dataKey="inValue" name={t('Entradas')} fill={theme.series[0]} radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false} />
            <Bar dataKey="outValue" name={t('Salidas')} fill={theme.series[1]} radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-blue-600 dark:text-blue-400">{t('Ver como tabla')}</summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <Table>
            <thead><tr><Th>{t('Día')}</Th><Th className="text-right">{t('Entradas')}</Th><Th className="text-right">{t('Salidas')}</Th><Th className="text-right">{t('Ajustes')}</Th><Th className="text-right">{t('Movimientos')}</Th></tr></thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {data.filter((d) => d.movements > 0).map((d) => (
                <tr key={d.date}>
                  <Td>{shortDate(d.date)}</Td>
                  <Td className="text-right">{formatMoney(d.inValue)}</Td>
                  <Td className="text-right">{formatMoney(d.outValue)}</Td>
                  <Td className="text-right">{formatMoney(d.adjustmentValue)}</Td>
                  <Td className="text-right">{d.movements}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </details>
    </>
  )
}

function ValuationChart({ group }: { group: ValuationGroup }) {
  const { t } = useTranslation()
  const theme = useChartTheme()
  const valuation = useQuery({ queryKey: ['reports', 'valuation', group], queryFn: () => reportsApi.valuation(group) })
  if (valuation.isPending) return <Spinner />
  if (valuation.isError) return <ErrorState error={valuation.error} onRetry={() => void valuation.refetch()} />
  if (valuation.data.length === 0) return <EmptyState title={t('No hay stock valorizado')} />
  const rows = valuation.data.map((r) => ({ ...r, label: r.name ?? t('Sin categoría') }))
  const total = rows.reduce((t, r) => t + r.costValue, 0)
  return (
    <>
      <div style={{ height: rows.length * 40 + 16 }} role="img" aria-label={t('Gráfico de valor del inventario')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 72, bottom: 0, left: 0 }} barCategoryGap={8}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="label" width={130} stroke={theme.axis} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: theme.grid, opacity: 0.4 }} />
            <Bar dataKey="costValue" name={t('Valor al costo')} fill={theme.series[0]} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
              <LabelList dataKey="costValue" position="right" formatter={(v: unknown) => formatMoneyCompact(Number(v))} fill={theme.text} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Table>
        <thead><tr><Th>{group === 'CATEGORY' ? 'Categoría' : 'Almacén'}</Th><Th className="text-right">{t('Productos')}</Th>
          <Th className="text-right">{t('Valor al costo')}</Th><Th className="text-right">{t('Valor de venta')}</Th><Th className="text-right">{t('% del total')}</Th></tr></thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
          {rows.map((r) => (
            <tr key={r.id ?? 'none'}>
              <Td className="font-medium">{r.label}</Td>
              <Td className="text-right">{r.products}</Td>
              <Td className="text-right">{formatMoney(r.costValue)}</Td>
              <Td className="text-right">{formatMoney(r.saleValue)}</Td>
              <Td className="text-right">{total > 0 ? formatPercent(r.costValue / total) : '—'}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  )
}

function TopProducts({ days }: { days: number }) {
  const { t } = useTranslation()
  const top = useQuery({ queryKey: ['reports', 'top', days], queryFn: () => reportsApi.topProducts(days, 10) })
  if (top.isPending) return <Spinner />
  if (top.isError) return <ErrorState error={top.error} onRetry={() => void top.refetch()} />
  if (top.data.length === 0) return <EmptyState title={t('No hubo salidas en el período')} />
  return (
    <Table>
      <thead><tr><Th>#</Th><Th>{t('Producto')}</Th><Th className="text-right">{t('Cantidad')}</Th><Th className="text-right">{t('Valor al costo')}</Th><Th className="text-right">{t('Salidas')}</Th></tr></thead>
      <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
        {top.data.map((t, i) => (
          <tr key={t.product.id}>
            <Td className="text-gray-500">{i + 1}</Td>
            <Td><div className="font-medium">{t.product.name}</div><div className="font-mono text-xs text-gray-500">{t.product.sku}</div></Td>
            <Td className="text-right">{formatNumber(t.outQuantity, t.product.unitDecimals)} {t.product.unitCode}</Td>
            <Td className="text-right">{formatMoney(t.outValue)}</Td>
            <Td className="text-right">{t.movements}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

export default function ReportsPage() {
  const { t } = useTranslation()
  const [days, setDays] = useState(30)
  const [group, setGroup] = useState<ValuationGroup>('CATEGORY')
  const periodOptions = PERIODS.map((d) => ({ value: d, label: t('{{count}} días', { count: d }) }))
  return (
    <>
      <PageHeader title={t('Reportes')} description={t('Valores calculados con el costo actual de cada producto.')}
        actions={<Segmented label={t('Período')} value={days} options={periodOptions} onChange={setDays} />} />
      <div className="grid gap-6">
        <Section title={t('Actividad')} description={t('Valor de las entradas y salidas por día, últimos {{count}} días.', { count: days })}>
          <ActivityChart days={days} />
        </Section>
        <div className="grid gap-6 xl:grid-cols-2">
          <Section title={t('Valor del inventario')} description={t('Stock actual valorizado al costo.')}
            actions={<Segmented label={t('Agrupar por')} value={group} onChange={setGroup}
              options={[{ value: 'CATEGORY', label: t('Categoría') }, { value: 'WAREHOUSE', label: t('Almacén') }]} />}>
            <ValuationChart group={group} />
          </Section>
          <Section title={t('Productos con más salidas')} description={t('Ordenados por valor al costo, últimos {{count}} días.', { count: days })}>
            <TopProducts days={days} />
          </Section>
        </div>
      </div>
    </>
  )
}
