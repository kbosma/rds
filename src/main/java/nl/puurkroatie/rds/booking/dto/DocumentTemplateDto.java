package nl.puurkroatie.rds.booking.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import nl.puurkroatie.rds.common.Default;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

public class DocumentTemplateDto {

    private UUID documentTemplateId;
    @NotNull
    @Size(max = 255)
    private String name;
    @Size(max = 1000)
    private String description;
    private byte[] templateData;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;
    private UUID tenantOrganization;

    @Default
    @JsonCreator
    public DocumentTemplateDto(UUID documentTemplateId, String name, String description, byte[] templateData, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.documentTemplateId = documentTemplateId;
        this.name = name;
        this.description = description;
        this.templateData = templateData;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public DocumentTemplateDto(String name, String description, byte[] templateData, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.name = name;
        this.description = description;
        this.templateData = templateData;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public UUID getDocumentTemplateId() {
        return documentTemplateId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public byte[] getTemplateData() {
        return templateData;
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
