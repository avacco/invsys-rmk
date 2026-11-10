package com.invsys.shared.web;

public class UnauthorizedException extends ApiException {

    public UnauthorizedException(String code, Object... args) {
        super(code, args);
    }
}
