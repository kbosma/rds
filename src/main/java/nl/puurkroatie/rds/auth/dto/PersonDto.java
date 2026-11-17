package nl.puurkroatie.rds.auth.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import nl.puurkroatie.rds.common.Default;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

public class PersonDto {

    private UUID persoonId;
    @NotNull
    @Size(max = 255)
    private String firstname;
    private String prefix;
    @NotNull
    @Size(max = 255)
    private String lastname;
    private UUID tenantOrganization;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;

    @Default
    @JsonCreator
    public PersonDto(UUID persoonId, String firstname, String prefix, String lastname, UUID tenantOrganization, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.persoonId = persoonId;
        this.firstname = firstname;
        this.prefix = prefix;
        this.lastname = lastname;
        this.tenantOrganization = tenantOrganization;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
    }

    public PersonDto(String firstname, String prefix, String lastname, UUID tenantOrganization, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.firstname = firstname;
        this.prefix = prefix;
        this.lastname = lastname;
        this.tenantOrganization = tenantOrganization;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
    }

    public UUID getPersoonId() {
        return persoonId;
    }

    public String getFirstname() {
        return firstname;
    }

    public String getPrefix() {
        return prefix;
    }

    public String getLastname() {
        return lastname;
    }

    public UUID getTenantOrganization() {
        return tenantOrganization;
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
}