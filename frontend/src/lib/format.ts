import i18n from '@/i18n'

let currency = 'USD'

/** Formatos de número y fecha según el idioma elegido en la interfaz. */
const locale = () => i18n.resolvedLanguage ?? 'es'

export function setCurrency(code: string) {
  currency = code
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  try {
    return new Intl.NumberFormat(locale(), { style: 'currency', currency }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

export function formatMoneyCompact(value: number): string {
  try {
    return new Intl.NumberFormat(locale(), { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(value)
  } catch {
    return String(value)
  }
}

export function formatPercent(ratio: number): string {
  return new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 1 }).format(ratio)
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat(locale(), { maximumFractionDigits: decimals }).format(value)
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}
