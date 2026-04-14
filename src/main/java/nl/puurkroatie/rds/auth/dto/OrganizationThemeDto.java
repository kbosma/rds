package nl.puurkroatie.rds.auth.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import nl.puurkroatie.rds.common.Default;

import java.time.LocalDateTime;
import java.util.UUID;

public class OrganizationThemeDto {

    private UUID organizationThemeId;

    @NotNull
    private UUID organizationId;

    @NotNull
    @Pattern(regexp = "^#[0-9a-fA-F]{6}$")
    private String primaryColor;

    @NotNull
    @Pattern(regexp = "^#[0-9a-fA-F]{6}$")
    private String accentColor;

    @Size(max = 500)
    private String logoUrl;

    @Pattern(regexp = "^#[0-9a-fA-F]{6}$")
    private String cardTitleColor;

    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;

    @Default
    @JsonCreator
    public OrganizationThemeDto(UUID organizationThemeId, UUID organizationId, String primaryColor, String accentColor, String logoUrl,
                                String cardTitleColor, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.organizationThemeId = organizationThemeId;
        this.organizationId = organizationId;
        this.primaryColor = primaryColor;
        this.accentColor = accentColor;
        this.logoUrl = logoUrl;
        this.cardTitleColor = cardTitleColor;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
    }

    public UUID getOrganizationThemeId() {
        return organizationThemeId;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getPrimaryColor() {
        return primaryColor;
    }

    public String getAccentColor() {
        return accentColor;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public String getCardTitleColor() {
        return cardTitleColor;
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
