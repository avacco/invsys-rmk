package com.invsys.identity.app;

import com.invsys.identity.domain.Role;
import com.invsys.identity.domain.User;
import com.invsys.shared.persistence.AuditInfo;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Set;

/** DTOs del módulo de identidad. */
public final class IdentityDtos {

    private IdentityDtos() {}

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    public record MeResponse(Long id, String username, String displayName, String email,
                             String role, List<String> permissions) {
        public static MeResponse of(User user) {
            return new MeResponse(user.getId(), user.getUsername(), user.getDisplayName(), user.getEmail(),
                    user.getRole().getName(), user.getRole().getPermissions().stream().sorted().toList());
        }
    }

    public record RoleRef(Long id, String name) {}

    public record UserResponse(Long id, String username, String displayName, String email,
                               RoleRef role, boolean enabled, AuditInfo audit) {
        public static UserResponse of(User user) {
            return new UserResponse(user.getId(), user.getUsername(), user.getDisplayName(), user.getEmail(),
                    new RoleRef(user.getRole().getId(), user.getRole().getName()), user.isEnabled(), AuditInfo.of(user));
        }
    }

    public record CreateUserRequest(
            @NotBlank @Size(min = 3, max = 50) @Pattern(regexp = "^[a-zA-Z0-9._-]+$",
                    message = "{validation.code}") String username,
            @NotBlank @Size(max = 100) String displayName,
            @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotNull Long roleId,
            Boolean enabled) {}

    /** password es opcional: si viene, se cambia. */
    public record UpdateUserRequest(
            @NotBlank @Size(max = 100) String displayName,
            @Email @Size(max = 255) String email,
            @Size(min = 8, max = 72) String password,
            @NotNull Long roleId,
            @NotNull Boolean enabled) {}

    public record RoleResponse(Long id, String name, String description, boolean system,
                               List<String> permissions, AuditInfo audit) {
        public static RoleResponse of(Role role) {
            return new RoleResponse(role.getId(), role.getName(), role.getDescription(), role.isSystem(),
                    role.getPermissions().stream().sorted().toList(), AuditInfo.of(role));
        }
    }

    public record RoleRequest(
            @NotBlank @Size(max = 50) @Pattern(regexp = "^[A-Z0-9_]+$",
                    message = "{validation.roleName}") String name,
            @Size(max = 255) String description,
            @NotNull Set<String> permissions) {}

    public record PermissionResponse(String value, String resource) {}
}
