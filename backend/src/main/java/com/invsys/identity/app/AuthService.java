package com.invsys.identity.app;

import com.invsys.identity.domain.RefreshToken;
import com.invsys.identity.domain.RefreshTokenRepository;
import com.invsys.identity.domain.User;
import com.invsys.identity.domain.UserRepository;
import com.invsys.identity.security.TokenService;
import com.invsys.shared.web.UnauthorizedException;
import java.time.Clock;
import java.time.Instant;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Inicio de sesión y rotación de refresh tokens. Cada refresh invalida el token usado y emite uno nuevo;
 * si llega un token ya revocado (posible robo), se revocan todas las sesiones del usuario.
 */
@Service
public class AuthService {

    public record Session(User user, String accessToken, String refreshToken) {}

    private static final String INVALID_CREDENTIALS = "Usuario o contraseña incorrectos";

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final TokenService tokens;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, TokenService tokens,
                       PasswordEncoder passwordEncoder, Clock clock) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @Transactional
    public Session login(String username, String password) {
        User user = users.findByUsername(username).orElse(null);
        if (user == null || !user.isEnabled() || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new UnauthorizedException(INVALID_CREDENTIALS);
        }
        return openSession(user, clock.instant());
    }

    @Transactional(noRollbackFor = UnauthorizedException.class)
    public Session refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new UnauthorizedException("Sesión no iniciada");
        }
        Instant now = clock.instant();
        RefreshToken current = refreshTokens.findByTokenHash(TokenService.hash(rawRefreshToken))
                .orElseThrow(() -> new UnauthorizedException("Sesión inválida"));
        User user = current.getUser();
        if (current.isRevoked()) {
            refreshTokens.revokeAllForUser(user.getId(), now);
            throw new UnauthorizedException("Sesión inválida");
        }
        if (current.isExpired(now) || !user.isEnabled()) {
            current.revoke(now);
            throw new UnauthorizedException("Sesión expirada");
        }
        current.revoke(now);
        return openSession(user, now);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        refreshTokens.findByTokenHash(TokenService.hash(rawRefreshToken))
                .ifPresent(token -> token.revoke(clock.instant()));
    }

    @Transactional
    public void revokeAllSessions(Long userId) {
        refreshTokens.revokeAllForUser(userId, clock.instant());
    }

    /** Limpieza diaria de refresh tokens vencidos. */
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void purgeExpiredTokens() {
        refreshTokens.deleteExpired(clock.instant());
    }

    private Session openSession(User user, Instant now) {
        String refreshValue = tokens.createRefreshTokenValue();
        refreshTokens.save(new RefreshToken(user, TokenService.hash(refreshValue), tokens.refreshTokenExpiry(now), now));
        return new Session(user, tokens.createAccessToken(user, now), refreshValue);
    }
}
