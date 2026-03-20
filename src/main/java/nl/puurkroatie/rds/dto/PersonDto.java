package nl.puurkroatie.rds.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class PersonDto {

    private UUID persoonId;
    private String firstname;
    private String prefix;
    private String lastname;
    private UUID organizationId;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;

    public PersonDto(UUID persoonId, String firstname, String prefix, String lastname, UUID organizationId, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.persoonId = persoonId;
        this.firstname = firstname;
        this.prefix = prefix;
        this.lastname = lastname;
        this.organizationId = organizationId;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
    }

    public PersonDto(String firstname, String prefix, String lastname, UUID organizationId, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.firstname = firstname;
        this.prefix = prefix;
        this.lastname = lastname;
        this.organizationId = organizationId;
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

    public UUID getOrganizationId() {
        return organizationId;
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