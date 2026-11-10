package com.invsys.shared.web;

public class NotFoundException extends ApiException {

    /** entity: product, category, unit, supplier, warehouse, user, role. */
    public NotFoundException(String entity, Object id) {
        super("error.notFound." + entity, id);
    }
}
