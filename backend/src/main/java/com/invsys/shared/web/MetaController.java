package com.invsys.shared.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Configuración pública que el frontend necesita antes de iniciar sesión. */
@RestController
@RequestMapping("/api/v1/meta")
public class MetaController {

    public record MetaResponse(String currency) {}

    private final String currency;

    public MetaController(@Value("${invsys.currency}") String currency) {
        this.currency = currency;
    }

    @GetMapping
    public MetaResponse meta() {
        return new MetaResponse(currency);
    }
}
