package com.invsys.shared.web;

public class BadRequestException extends ApiException {

    public BadRequestException(String code, Object... args) {
        super(code, args);
    }
}
