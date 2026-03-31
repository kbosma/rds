package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.*;

import nl.puurkroatie.rds.auth.security.TenantContext;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "address")
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "address_id")
    private UUID addressId;

    @Column(name = "street")
    private String street;

    @Column(name = "housenumber")
    private Integer housenumber;

    @Column(name = "housenumber_addition")
    private String housenumberAddition;

    @Column(name = "postalcode")
    private String postalcode;

    @Column(name = "city")
    private String city;

    @Column(name = "country")
    private String country;

    @Enumerated(EnumType.STRING)
    @Column(name = "addressrole", nullable = false)
    private AddressRole addressrole;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @Column(name = "modified_at")
    private LocalDateTime modifiedAt;

    @Column(name = "modified_by")
    private UUID modifiedBy;

    @Column(name = "tenant_organization", nullable = false, updatable = false)
    private UUID tenantOrganization;

    protected Address() {
    }

    public Address(UUID addressId, String street, Integer housenumber, String housenumberAddition, String postalcode, String city, String country, AddressRole addressrole) {
        this.addressId = addressId;
        this.street = street;
        this.housenumber = housenumber;
        this.housenumberAddition = housenumberAddition;
        this.postalcode = postalcode;
        this.city = city;
        this.country = country;
        this.addressrole = addressrole;
    }

    public Address(String street, Integer housenumber, String housenumberAddition, String postalcode, String city, String country, AddressRole addressrole) {
        this.street = street;
        this.housenumber = housenumber;
        this.housenumberAddition = housenumberAddition;
        this.postalcode = postalcode;
        this.city = city;
        this.country = country;
        this.addressrole = addressrole;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.createdBy = TenantContext.getAccountId();
        this.tenantOrganization = TenantContext.getOrganizationId();
    }

    @PreUpdate
    protected void onUpdate() {
        this.modifiedAt = LocalDateTime.now();
        this.modifiedBy = TenantContext.getAccountId();
    }

    public UUID getAddressId() {
        return addressId;
    }

    public String getStreet() {
        return street;
    }

    public Integer getHousenumber() {
        return housenumber;
    }

    public String getHousenumberAddition() {
        return housenumberAddition;
    }

    public String getPostalcode() {
        return postalcode;
    }

    public String getCity() {
        return city;
    }

    public String getCountry() {
        return country;
    }

    public AddressRole getAddressrole() {
        return addressrole;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public LocalDateTime getModifiedAt() {
        return modifiedAt;
    }

    public UUID getModifiedBy() {
        return modifiedBy;
    }

    public UUID getTenantOrganization() {
        return tenantOrganization;
    }
}
