package com.invsys.identity.app;

import com.invsys.identity.app.IdentityDtos.CreateUserRequest;
import com.invsys.identity.app.IdentityDtos.UpdateUserRequest;
import com.invsys.identity.app.IdentityDtos.UserResponse;
import com.invsys.identity.domain.Role;
import com.invsys.identity.domain.RoleRepository;
import com.invsys.identity.domain.User;
import com.invsys.identity.domain.UserRepository;
import com.invsys.shared.web.BadRequestException;
import com.invsys.shared.web.ConflictException;
import com.invsys.shared.web.NotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.invsys.audit.app.AuditLog;
import com.invsys.audit.domain.AuditAction;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserService {

    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;

    private final AuditLog audit;

    public UserService(UserRepository users, RoleRepository roles, PasswordEncoder passwordEncoder, AuthService authService, AuditLog audit) {
        this.audit = audit;
        this.users = users;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> list(Pageable pageable) {
        return users.findAll(pageable).map(UserResponse::of);
    }

    @Transactional(readOnly = true)
    public UserResponse get(Long id) {
        return UserResponse.of(find(id));
    }

    @Transactional(readOnly = true)
    public User getByUsername(String username) {
        return users.findByUsername(username).orElseThrow(() -> new NotFoundException("Usuario", username));
    }

    public UserResponse create(CreateUserRequest request) {
        if (users.existsByUsernameIgnoreCase(request.username())) {
            throw new ConflictException("Ya existe un usuario con ese nombre");
        }
        User user = new User(request.username(), passwordEncoder.encode(request.password()),
                request.displayName(), blankToNull(request.email()), findRole(request.roleId()));
        if (Boolean.FALSE.equals(request.enabled())) {
            user.update(user.getDisplayName(), user.getEmail(), user.getRole(), false);
        }
        User saved = users.save(user);
        audit.record(AuditAction.CREATE, "user", saved.getId(), saved.getUsername() + " · " + saved.getRole().getName());
        return UserResponse.of(saved);
    }

    public UserResponse update(Long id, UpdateUserRequest request, String currentUsername) {
        User user = find(id);
        boolean self = user.getUsername().equals(currentUsername);
        Role role = findRole(request.roleId());
        if (self && (!request.enabled() || !role.getId().equals(user.getRole().getId()))) {
            throw new BadRequestException("No podés desactivarte ni cambiar tu propio rol");
        }
        user.update(request.displayName(), blankToNull(request.email()), role, request.enabled());
        if (request.password() != null && !request.password().isBlank()) {
            user.changePassword(passwordEncoder.encode(request.password()));
            authService.revokeAllSessions(user.getId());
        }
        if (!request.enabled()) {
            authService.revokeAllSessions(user.getId());
        }
        audit.record(AuditAction.UPDATE, "user", id, user.getUsername() + " · " + role.getName()
                + (request.enabled() ? "" : " · disabled")
                + (request.password() != null && !request.password().isBlank() ? " · password changed" : ""));
        return UserResponse.of(user);
    }

    public void delete(Long id, String currentUsername) {
        User user = find(id);
        if (user.getUsername().equals(currentUsername)) {
            throw new BadRequestException("No podés eliminar tu propio usuario");
        }
        users.delete(user);
        audit.record(AuditAction.DELETE, "user", id, user.getUsername());
    }

    private User find(Long id) {
        return users.findById(id).orElseThrow(() -> new NotFoundException("Usuario", id));
    }

    private Role findRole(Long id) {
        return roles.findById(id).orElseThrow(() -> new BadRequestException("El rol " + id + " no existe"));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
