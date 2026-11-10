package com.invsys.identity.app;

import com.invsys.identity.domain.Role;
import com.invsys.identity.domain.RoleRepository;
import com.invsys.identity.domain.User;
import com.invsys.identity.domain.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Crea el usuario "admin" la primera vez que arranca la aplicación con la base vacía. */
@Component
@Order(1)
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final String adminPassword;

    public AdminBootstrap(UserRepository users, RoleRepository roles, PasswordEncoder passwordEncoder,
                          @Value("${invsys.bootstrap.admin-password:}") String adminPassword) {
        this.users = users;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.adminPassword = adminPassword;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.count() > 0) {
            return;
        }
        if (adminPassword == null || adminPassword.isBlank()) {
            log.warn("No hay usuarios y ADMIN_PASSWORD no está definido: nadie podrá iniciar sesión");
            return;
        }
        Role admin = roles.findByName("ADMIN").orElseThrow();
        users.save(new User("admin", passwordEncoder.encode(adminPassword), "Administrador", null, admin));
        log.info("Usuario admin creado");
    }
}
