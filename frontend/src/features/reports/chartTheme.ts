import { useUi } from '@/store/ui'

/**
 * Colores de los gráficos. Slots 1 y 2 de la paleta categórica de referencia, validados
 * (separación para daltonismo y contraste ≥ 3:1) contra la superficie clara y la oscura.
 */
export function useChartTheme() {
  const dark = useUi((s) => s.darkMode)
  return dark
    ? { series: ['#3987e5', '#d95926'], grid: '#374151', axis: '#9ca3af', surface: '#1f2937', text: '#f3f4f6' }
    : { series: ['#2a78d6', '#eb6834'], grid: '#e5e7eb', axis: '#6b7280', surface: '#ffffff', text: '#111827' }
}
