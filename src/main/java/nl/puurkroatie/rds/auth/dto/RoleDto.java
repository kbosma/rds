package nl.puurkroatie.rds.auth.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import nl.puurkroatie.rds.common.Default;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Een rol. Bij aanmaken en wijzigen levert de client {@code description} en optioneel {@code authorities} aan;
 * organisatie en systeemsleutel bepaalt de server. {@code editable}: mag de ingelogde gebruiker deze rol wijzigen
 * (eigen rol, onder zijn niveau)?
 * <p>
 * {@code authorities} is de gewenste, volledige set rechten (namen). De server slaat alleen het verschil met de
 * huidige set op. Leeg laten ({@code null}) laat de rechten ongemoeid; in antwoorden staat het veld er niet in.
 */
public class RoleDto {

    private final UUID roleId;

    @NotBlank
    @Size(max = 255)
    private final String description;

    private final UUID tenantOrganization;
    private final String systemKey;
    private final Boolean editable;
    /** Aantal accounts met deze rol. */
    private final Long accountCount;
    private final LocalDateTime createdAt;
    private final UUID createdBy;
    private final LocalDateTime modifiedAt;
    private final UUID modifiedBy;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final List<String> authorities;

    @Default
    public RoleDto(UUID roleId, String description, UUID tenantOrganization, String systemKey, Boolean editable,
                   Long accountCount, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy,
                   List<String> authorities) {
        this.roleId = roleId;
        this.accountCount = accountCount;
        this.description = description;
        this.tenantOrganization = tenantOrganization;
        this.systemKey = systemKey;
        this.editable = editable;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.authorities = authorities == null ? null : List.copyOf(authorities);
    }

    /** Wat een client mag aanleveren: de naam en eventueel de gewenste rechten. */
    @JsonCreator
    public RoleDto(@JsonProperty("description") String description, @JsonProperty("authorities") List<String> authorities) {
        this(null, description, null, null, null, null, null, null, null, null, authorities);
    }

    public RoleDto withEditable(boolean editable, long accountCount) {
        return new RoleDto(roleId, description, tenantOrganization, systemKey, editable, accountCount,
                createdAt, createdBy, modifiedAt, modifiedBy, authorities);
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

    public Long getAccountCount() {
        return accountCount;
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

    public List<String> getAuthorities() {
        return authorities;
    }
}
