package com.invsys.identity.domain;

import java.util.Arrays;
import java.util.Optional;

/**
 * Permisos del sistema con formato {@code recurso:operación}. Están definidos en el código
 * (cada endpoint depende de ellos) y se asignan a roles desde la base de datos.
 */
public enum Permission {
    CATALOG_READ("catalog:read"),
    CATALOG_WRITE("catalog:write"),
    PARTNERS_READ("partners:read"),
    PARTNERS_WRITE("partners:write"),
    USERS_READ("users:read"),
    USERS_WRITE("users:write"),
    ROLES_READ("roles:read"),
    ROLES_WRITE("roles:write"),
    INVENTORY_READ("inventory:read"),
    INVENTORY_WRITE("inventory:write");

    private final String value;

    Permission(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public String resource() {
        return value.substring(0, value.indexOf(':'));
    }

    public static Optional<Permission> fromValue(String value) {
        return Arrays.stream(values()).filter(p -> p.value.equals(value)).findFirst();
    }
}
