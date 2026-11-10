package com.invsys.partners.domain;

import com.invsys.shared.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "suppliers")
public class Supplier extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    /** Identificador fiscal genérico (CUIT, RUT, RFC, NIF, EIN...). Sin validación por país. */
    @Column(name = "tax_id", length = 50)
    private String taxId;

    private String email;
    private String phone;
    private String address;
    private String notes;

    @Column(nullable = false)
    private boolean active = true;

    protected Supplier() {}

    public Supplier(String name) {
        this.name = name;
    }

    public void update(String name, String taxId, String email, String phone, String address, String notes, boolean active) {
        this.name = name;
        this.taxId = taxId;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.notes = notes;
        this.active = active;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getTaxId() { return taxId; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getAddress() { return address; }
    public String getNotes() { return notes; }
    public boolean isActive() { return active; }
}
