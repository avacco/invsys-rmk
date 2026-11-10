import type { AuditAction } from '@/api/types'

export const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Creación',
  UPDATE: 'Modificación',
  DELETE: 'Eliminación',
  STOCK_MOVEMENT: 'Movimiento de stock',
  LOGIN: 'Inicio de sesión',
  LOGIN_FAILED: 'Inicio de sesión fallido',
  LOGOUT: 'Cierre de sesión',
  SESSION_REVOKED: 'Sesiones revocadas',
}

export const ACTION_TONES: Record<AuditAction, 'green' | 'blue' | 'red' | 'amber' | 'gray'> = {
  CREATE: 'green', UPDATE: 'blue', DELETE: 'red', STOCK_MOVEMENT: 'blue',
  LOGIN: 'gray', LOGIN_FAILED: 'amber', LOGOUT: 'gray', SESSION_REVOKED: 'red',
}

export const ENTITY_LABELS: Record<string, string> = {
  product: 'Producto', category: 'Categoría', unit: 'Unidad', supplier: 'Proveedor',
  warehouse: 'Almacén', user: 'Usuario', role: 'Rol',
}

const STOCK_TYPES: Record<string, string> = {
  IN: 'Entrada', OUT: 'Salida', ADJUSTMENT: 'Ajuste', TRANSFER: 'Transferencia',
}

/** Los movimientos guardan el tipo como código al inicio ("OUT · -3 u · ..."); acá se traduce. */
export function formatSummary(action: AuditAction, summary?: string): string {
  if (!summary) return '—'
  if (action !== 'STOCK_MOVEMENT') return summary
  const [code, ...rest] = summary.split(' · ')
  return [STOCK_TYPES[code] ?? code, ...rest].join(' · ')
}
