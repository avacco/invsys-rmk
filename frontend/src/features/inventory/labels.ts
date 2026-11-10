import type { MovementKind, MovementType } from '@/api/types'

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  IN: 'Entrada',
  OUT: 'Salida',
  ADJUSTMENT: 'Ajuste',
  TRANSFER_OUT: 'Transferencia (salida)',
  TRANSFER_IN: 'Transferencia (entrada)',
}

export const KIND_LABELS: Record<MovementKind, string> = {
  IN: 'Entrada',
  OUT: 'Salida',
  ADJUSTMENT: 'Ajuste por conteo',
  TRANSFER: 'Transferencia entre almacenes',
}

export const KIND_HELP: Record<MovementKind, string> = {
  IN: 'Mercadería que ingresa al almacén (compra, devolución de cliente...).',
  OUT: 'Mercadería que sale del almacén (venta, consumo, merma...).',
  ADJUSTMENT: 'Ingresá la cantidad contada físicamente; el sistema registra la diferencia.',
  TRANSFER: 'Mueve unidades de un almacén a otro. Genera una salida y una entrada.',
}
