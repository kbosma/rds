package nl.puurkroatie.rds.auth.dto;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.time.LocalDateTime;
import java.util.UUID;

public class OrganizationDto {

    private UUID organizationId;
    private String name;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;

    @JsonCreator
    public OrganizationDto(UUID organizationId, String name, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.organizationId = organizationId;
        this.name = name;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
    }

    public OrganizationDto(String name, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.name = name;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getName() {
        return name;
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