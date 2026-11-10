package com.invsys.shared.web;

/** El pedido es válido pero choca con el estado actual (duplicados, referencias en uso, etc.). */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
