package com.invsys.audit.domain;

public enum AuditAction {
    CREATE,
    UPDATE,
    DELETE,
    STOCK_MOVEMENT,
    LOGIN,
    LOGIN_FAILED,
    LOGOUT,
    /** Se reutilizó un refresh token ya rotado: se cerraron todas las sesiones del usuario. */
    SESSION_REVOKED
}
