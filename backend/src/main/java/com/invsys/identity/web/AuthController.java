package com.invsys.identity.web;

import com.invsys.identity.app.AuthService;
import com.invsys.identity.app.AuthService.Session;
import com.invsys.identity.app.IdentityDtos.LoginRequest;
import com.invsys.identity.app.IdentityDtos.MeResponse;
import com.invsys.identity.app.UserService;
import com.invsys.identity.security.AuthCookies;
import com.invsys.shared.web.UnauthorizedException;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;
    private final AuthCookies cookies;

    public AuthController(AuthService authService, UserService userService, AuthCookies cookies) {
        this.authService = authService;
        this.userService = userService;
        this.cookies = cookies;
    }

    @PostMapping("/login")
    public ResponseEntity<MeResponse> login(@Valid @RequestBody LoginRequest request) {
        return withSession(authService.login(request.username(), request.password()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<MeResponse> refresh(
            @CookieValue(name = AuthCookies.REFRESH, required = false) String refreshToken) {
        try {
            return withSession(authService.refresh(refreshToken));
        } catch (UnauthorizedException e) {
            // Sesión inválida: además del 401, se borran las cookies del navegador.
            return ResponseEntity.status(401)
                    .header(HttpHeaders.SET_COOKIE, cookies.clearAccess().toString())
                    .header(HttpHeaders.SET_COOKIE, cookies.clearRefresh().toString())
                    .build();
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = AuthCookies.REFRESH, required = false) String refreshToken) {
        authService.logout(refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookies.clearAccess().toString())
                .header(HttpHeaders.SET_COOKIE, cookies.clearRefresh().toString())
                .build();
    }

    @GetMapping("/me")
    public MeResponse me(Authentication authentication) {
        return MeResponse.of(userService.getByUsername(authentication.getName()));
    }

    private ResponseEntity<MeResponse> withSession(Session session) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.access(session.accessToken()).toString())
                .header(HttpHeaders.SET_COOKIE, cookies.refresh(session.refreshToken()).toString())
                .body(MeResponse.of(session.user()));
    }
}
