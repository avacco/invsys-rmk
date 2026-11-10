package com.invsys.shared.web;

public class ConflictException extends ApiException {

    public ConflictException(String code, Object... args) {
        super(code, args);
    }
}
