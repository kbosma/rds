package nl.puurkroatie.rds.auth.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import nl.puurkroatie.rds.common.Default;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Een rol. Bij aanmaken en hernoemen telt alleen {@code description}; organisatie en systeemsleutel bepaalt de server.
 * {@code editable}: mag de ingelogde gebruiker deze rol wijzigen (eigen rol, onder zijn niveau)?
 */
public class RoleDto {

    private final UUID roleId;

    @NotBlank
    @Size(max = 255)
    private final String description;

    private final UUID tenantOrganization;
    private final String systemKey;
    private final Boolean editable;
    private final LocalDateTime createdAt;
    private final UUID createdBy;
    private final LocalDateTime modifiedAt;
    private final UUID modifiedBy;

    @Default
    public RoleDto(UUID roleId, String description, UUID tenantOrganization, String systemKey, Boolean editable,
                   LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.roleId = roleId;
        this.description = description;
        this.tenantOrganization = tenantOrganization;
        this.systemKey = systemKey;
        this.editable = editable;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
    }

    /** Wat een client mag aanleveren: alleen de naam. */
    @JsonCreator
    public RoleDto(@JsonProperty("description") String description) {
        this(null, description, null, null, null, null, null, null, null);
    }

    public RoleDto withEditable(boolean editable) {
        return new RoleDto(roleId, description, tenantOrganization, systemKey, editable, createdAt, createdBy, modifiedAt, modifiedBy);
    }

    public UUID getRoleId() {
        return roleId;
    }

    public String getDescription() {
        return description;
    }

    public UUID getTenantOrganization() {
        return tenantOrganization;
    }

    public String getSystemKey() {
        return systemKey;
    }

    public Boolean getEditable() {
        return editable;
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
