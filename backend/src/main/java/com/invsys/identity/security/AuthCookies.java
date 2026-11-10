package com.invsys.identity.security;

import java.time.Duration;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Cookies de sesión. Ambas son httpOnly (JavaScript no puede leerlas) y SameSite=Strict
 * (el navegador no las envía en peticiones originadas en otros sitios, lo que evita CSRF).
 * El refresh token solo viaja a las rutas de autenticación.
 */
@Component
public class AuthCookies {

    public static final String ACCESS = "access_token";
    public static final String REFRESH = "refresh_token";
    static final String REFRESH_PATH = "/api/v1/auth";

    private final SecurityProperties properties;

    public AuthCookies(SecurityProperties properties) {
        this.properties = properties;
    }

    public ResponseCookie access(String token) {
        return build(ACCESS, token, "/", properties.accessTokenTtl());
    }

    public ResponseCookie refresh(String token) {
        return build(REFRESH, token, REFRESH_PATH, properties.refreshTokenTtl());
    }

    public ResponseCookie clearAccess() {
        return build(ACCESS, "", "/", Duration.ZERO);
    }

    public ResponseCookie clearRefresh() {
        return build(REFRESH, "", REFRESH_PATH, Duration.ZERO);
    }

    private ResponseCookie build(String name, String value, String path, Duration maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .sameSite("Strict")
                .path(path)
                .maxAge(maxAge)
                .build();
    }
}
