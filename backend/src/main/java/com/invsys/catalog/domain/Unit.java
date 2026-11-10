package com.invsys.catalog.domain;

import com.invsys.shared.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Unidad de medida configurable (unidad, kg, litro...). decimals indica cuántos decimales admite el stock. */
@Entity
@Table(name = "units")
public class Unit extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 16)
    private String code;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false)
    private short decimals;

    protected Unit() {}

    public Unit(String code, String name, short decimals) {
        update(code, name, decimals);
    }

    public void update(String code, String name, short decimals) {
        this.code = code;
        this.name = name;
        this.decimals = decimals;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public short getDecimals() { return decimals; }
}
