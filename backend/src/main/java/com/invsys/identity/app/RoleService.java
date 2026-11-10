package com.invsys.identity.app;

import com.invsys.identity.app.IdentityDtos.PermissionResponse;
import com.invsys.identity.app.IdentityDtos.RoleRequest;
import com.invsys.identity.app.IdentityDtos.RoleResponse;
import com.invsys.identity.domain.Permission;
import com.invsys.identity.domain.Role;
import com.invsys.identity.domain.RoleRepository;
import com.invsys.identity.domain.UserRepository;
import com.invsys.shared.web.BadRequestException;
import com.invsys.shared.web.ConflictException;
import com.invsys.shared.web.NotFoundException;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.Sort;
import com.invsys.audit.app.AuditLog;
import com.invsys.audit.domain.AuditAction;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class RoleService {

    private final RoleRepository roles;
    private final UserRepository users;

    private final AuditLog audit;

    public RoleService(RoleRepository roles, UserRepository users, AuditLog audit) {
        this.audit = audit;
        this.roles = roles;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> list() {
        return roles.findAll(Sort.by("name")).stream().map(RoleResponse::of).toList();
    }

    @Transactional(readOnly = true)
    public RoleResponse get(Long id) {
        return RoleResponse.of(find(id));
    }

    public RoleResponse create(RoleRequest request) {
        if (roles.existsByNameIgnoreCase(request.name())) {
            throw new ConflictException("error.role.duplicate");
        }
        validatePermissions(request.permissions());
        Role saved = roles.save(new Role(request.name(), request.description(), request.permissions()));
        audit.record(AuditAction.CREATE, "role", saved.getId(), describe(saved));
        return RoleResponse.of(saved);
    }

    public RoleResponse update(Long id, RoleRequest request) {
        Role role = find(id);
        if (role.isSystem()) {
            throw new BadRequestException("error.role.systemReadOnly");
        }
        if (roles.existsByNameIgnoreCaseAndIdNot(request.name(), id)) {
            throw new ConflictException("error.role.duplicate");
        }
        validatePermissions(request.permissions());
        role.update(request.name(), request.description(), request.permissions());
        audit.record(AuditAction.UPDATE, "role", id, describe(role));
        return RoleResponse.of(role);
    }

    public void delete(Long id) {
        Role role = find(id);
        if (role.isSystem()) {
            throw new BadRequestException("error.role.systemUndeletable");
        }
        if (users.countByRoleId(id) > 0) {
            throw new ConflictException("error.role.inUse");
        }
        roles.delete(role);
        audit.record(AuditAction.DELETE, "role", id, role.getName());
    }

    public List<PermissionResponse> permissions() {
        return Arrays.stream(Permission.values()).map(p -> new PermissionResponse(p.value(), p.resource())).toList();
    }

    private static String describe(Role role) {
        return role.getName() + " · " + String.join(", ", role.getPermissions().stream().sorted().toList());
    }

    private Role find(Long id) {
        return roles.findById(id).orElseThrow(() -> new NotFoundException("role", id));
    }

    private static void validatePermissions(Set<String> permissions) {
        List<String> unknown = permissions.stream().filter(p -> Permission.fromValue(p).isEmpty()).sorted().toList();
        if (!unknown.isEmpty()) {
            throw new BadRequestException("error.role.unknownPermissions", String.join(", ", unknown));
        }
    }
}
