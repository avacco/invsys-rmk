package com.invsys.audit.app;

import com.invsys.audit.domain.AuditEntry;
import com.invsys.audit.domain.AuditEntryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Persiste los eventos de auditoría después del commit, en una transacción propia.
 * Si el evento se publica fuera de una transacción (p. ej. un login fallido), se guarda en el momento.
 * Un fallo al auditar se registra en el log pero no rompe la operación del usuario.
 */
@Component
public class AuditEventListener {

    private static final Logger log = LoggerFactory.getLogger(AuditEventListener.class);

    private final AuditEntryRepository entries;

    public AuditEventListener(AuditEntryRepository entries) {
        this.entries = entries;
    }

    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(AuditEvent e) {
        try {
            entries.save(new AuditEntry(e.occurredAt(), e.actor(), e.action(), e.entityType(), e.entityId(), e.summary()));
        } catch (RuntimeException ex) {
            log.error("No se pudo guardar la entrada de auditoría {}", e, ex);
        }
    }
}
