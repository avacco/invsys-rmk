import type { TFunction } from 'i18next'
import type { AuditAction } from '@/api/types'
import { tk } from '@/i18n'

export const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: tk('Creación'),
  UPDATE: tk('Modificación'),
  DELETE: tk('Eliminación'),
  STOCK_MOVEMENT: tk('Movimiento de stock'),
  LOGIN: tk('Inicio de sesión'),
  LOGIN_FAILED: tk('Inicio de sesión fallido'),
  LOGOUT: tk('Cierre de sesión'),
  SESSION_REVOKED: tk('Sesiones revocadas'),
}

export const ACTION_TONES: Record<AuditAction, 'green' | 'blue' | 'red' | 'amber' | 'gray'> = {
  CREATE: 'green', UPDATE: 'blue', DELETE: 'red', STOCK_MOVEMENT: 'blue',
  LOGIN: 'gray', LOGIN_FAILED: 'amber', LOGOUT: 'gray', SESSION_REVOKED: 'red',
}

export const ENTITY_LABELS: Record<string, string> = {
  product: tk('Producto'), category: tk('Categoría'), unit: tk('Unidad'), supplier: tk('Proveedor'),
  warehouse: tk('Almacén'), user: tk('Usuario'), role: tk('Rol'),
}

/** Fragmentos fijos que el backend agrega al detalle (en inglés neutro) y su texto en la interfaz. */
const SUMMARY_TOKENS: Record<string, string> = {
  IN: tk('Entrada'), OUT: tk('Salida'), ADJUSTMENT: tk('Ajuste'), TRANSFER: tk('Transferencia'),
  image: tk('imagen'), 'image removed': tk('imagen eliminada'), disabled: tk('deshabilitado'),
  'password changed': tk('contraseña cambiada'),
}

/** El detalle se guarda sin idioma ("OUT · -3 u · Martillo (FER-001)"); acá se traducen los fragmentos fijos. */
export function formatSummary(t: TFunction, summary?: string): string {
  if (!summary) return '—'
  return summary.split(' · ').map((part) => (part in SUMMARY_TOKENS ? t(SUMMARY_TOKENS[part]) : part)).join(' · ')
}

export function entityLabel(t: TFunction, entityType?: string, entityId?: string): string {
  if (!entityType) return '—'
  const name = ENTITY_LABELS[entityType] ? t(ENTITY_LABELS[entityType]) : entityType
  return entityId ? `${name} #${entityId}` : name
}
