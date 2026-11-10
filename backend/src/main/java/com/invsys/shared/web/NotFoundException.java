package com.invsys.shared.web;

public class NotFoundException extends RuntimeException {

    public NotFoundException(String resource, Object id) {
        super("%s %s no existe".formatted(resource, id));
    }
}
