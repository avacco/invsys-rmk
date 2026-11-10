package com.invsys.identity.app;

import com.invsys.identity.domain.RoleRepository;
import com.invsys.identity.domain.User;
import com.invsys.identity.domain.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Usuarios de prueba para desarrollo: uno por rol. */
@Component
@Profile("dev")
@Order(2)
public class DevUsersSeeder implements ApplicationRunner {

    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;

    public DevUsersSeeder(UserRepository users, RoleRepository roles, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        create("manager", "Gerente Demo", "MANAGER");
        create("viewer", "Consulta Demo", "VIEWER");
    }

    private void create(String username, String displayName, String roleName) {
        if (users.existsByUsernameIgnoreCase(username)) {
            return;
        }
        roles.findByName(roleName).ifPresent(role ->
                users.save(new User(username, passwordEncoder.encode(username + "1234"), displayName, null, role)));
    }
}
