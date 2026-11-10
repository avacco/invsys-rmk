package com.invsys.audit.app;

import com.invsys.audit.domain.AuditAction;
import java.time.Clock;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Punto de entrada para auditar. Publica un evento que se guarda solo si la transacción que lo
 * originó se confirma (ver AuditEventListener): un cambio revertido no deja rastro falso.
 */
@Component
public class AuditLog {

    private static final int MAX_SUMMARY = 500;

    private final ApplicationEventPublisher events;
    private final Clock clock;

    public AuditLog(ApplicationEventPublisher events, Clock clock) {
        this.events = events;
        this.clock = clock;
    }

    /** Registra una acción del usuario autenticado. */
    public void record(AuditAction action, String entityType, Object entityId, String summary) {
        recordAs(currentActor(), action, entityType, entityId, summary);
    }

    /** Registra una acción con un actor explícito (p. ej. un intento de login, sin sesión todavía). */
    public void recordAs(String actor, AuditAction action, String entityType, Object entityId, String summary) {
        String text = summary == null || summary.length() <= MAX_SUMMARY ? summary : summary.substring(0, MAX_SUMMARY);
        events.publishEvent(new AuditEvent(clock.instant(), actor, action, entityType,
                entityId == null ? null : String.valueOf(entityId), text));
    }

    private static String currentActor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return "system";
        }
        return auth.getName();
    }
}
