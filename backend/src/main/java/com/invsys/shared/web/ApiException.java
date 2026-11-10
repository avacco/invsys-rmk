package com.invsys.shared.web;

import java.util.Arrays;

/**
 * Error de negocio con un código de mensaje (messages*.properties). El texto se resuelve
 * en el idioma de la petición (Accept-Language) al armar la respuesta.
 */
public abstract class ApiException extends RuntimeException {

    private final String code;
    private final Object[] args;

    protected ApiException(String code, Object... args) {
        super(code);
        this.code = code;
        // Como texto, para que MessageFormat no agrupe miles en ids o cantidades.
        this.args = Arrays.stream(args).map(String::valueOf).toArray();
    }

    public String getCode() { return code; }
    public Object[] getArgs() { return args.clone(); }
}
