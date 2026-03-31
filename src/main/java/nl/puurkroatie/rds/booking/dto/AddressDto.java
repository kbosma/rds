package nl.puurkroatie.rds.booking.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import nl.puurkroatie.rds.common.Default;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

public class AddressDto {

    private UUID addressId;
    @NotNull
    @Size(max = 255)
    private String street;
    private Integer housenumber;
    private String housenumberAddition;
    private String postalcode;
    @NotNull
    @Size(max = 255)
    private String city;
    @NotNull
    @Size(max = 255)
    private String country;
    private String addressrole;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;
    private UUID tenantOrganization;

    @Default
    @JsonCreator
    public AddressDto(UUID addressId, String street, Integer housenumber, String housenumberAddition, String postalcode, String city, String country, String addressrole, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.addressId = addressId;
        this.street = street;
        this.housenumber = housenumber;
        this.housenumberAddition = housenumberAddition;
        this.postalcode = postalcode;
        this.city = city;
        this.country = country;
        this.addressrole = addressrole;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public AddressDto(String street, Integer housenumber, String housenumberAddition, String postalcode, String city, String country, String addressrole, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.street = street;
        this.housenumber = housenumber;
        this.housenumberAddition = housenumberAddition;
        this.postalcode = postalcode;
        this.city = city;
        this.country = country;
        this.addressrole = addressrole;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
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

    public String getAddressrole() {
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
