import type { MovementKind, MovementType } from '@/api/types'
import { tk } from '@/i18n'

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  IN: tk('Entrada'),
  OUT: tk('Salida'),
  ADJUSTMENT: tk('Ajuste'),
  TRANSFER_OUT: tk('Transferencia (salida)'),
  TRANSFER_IN: tk('Transferencia (entrada)'),
}

export const KIND_LABELS: Record<MovementKind, string> = {
  IN: tk('Entrada'),
  OUT: tk('Salida'),
  ADJUSTMENT: tk('Ajuste por conteo'),
  TRANSFER: tk('Transferencia entre almacenes'),
}

export const KIND_HELP: Record<MovementKind, string> = {
  IN: tk('Mercadería que ingresa al almacén (compra, devolución de cliente...).'),
  OUT: tk('Mercadería que sale del almacén (venta, consumo, merma...).'),
  ADJUSTMENT: tk('Ingresa la cantidad contada físicamente; el sistema registra la diferencia.'),
  TRANSFER: tk('Mueve unidades de un almacén a otro. Genera una salida y una entrada.'),
}
