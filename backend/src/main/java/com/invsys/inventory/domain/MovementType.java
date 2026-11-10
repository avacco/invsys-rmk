package com.invsys.inventory.domain;

/** Tipo de cada fila de movimiento. Una transferencia genera un TRANSFER_OUT y un TRANSFER_IN. */
public enum MovementType {
    IN,
    OUT,
    ADJUSTMENT,
    TRANSFER_OUT,
    TRANSFER_IN
}
