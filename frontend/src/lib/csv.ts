/**
 * Escapa un valor para CSV y neutraliza la inyección de fórmulas: si una celda empieza
 * con =, +, -, @, tab o retorno de carro, Excel la interpretaría como fórmula.
 */
export function toCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""'
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  // BOM UTF-8 para que Excel muestre bien tildes y eñes.
  const blob = new Blob(['﻿' + toCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
