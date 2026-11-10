package com.invsys.partners.app;

import com.invsys.partners.domain.Supplier;
import com.invsys.shared.persistence.AuditInfo;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class SupplierDtos {

    private SupplierDtos() {}

    public record SupplierRequest(
            @NotBlank @Size(max = 150) String name,
            @Size(max = 50) String taxId,
            @Email @Size(max = 255) String email,
            @Size(max = 50) String phone,
            @Size(max = 255) String address,
            @Size(max = 2000) String notes,
            Boolean active) {}

    public record SupplierResponse(Long id, String name, String taxId, String email, String phone,
                                   String address, String notes, boolean active, AuditInfo audit) {
        public static SupplierResponse of(Supplier s) {
            return new SupplierResponse(s.getId(), s.getName(), s.getTaxId(), s.getEmail(), s.getPhone(),
                    s.getAddress(), s.getNotes(), s.isActive(), AuditInfo.of(s));
        }
    }
}
