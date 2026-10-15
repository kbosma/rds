package nl.puurkroatie.rds.email.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import nl.puurkroatie.rds.common.Default;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

public class EmailTemplateDto {

    private UUID emailTemplateId;
    @NotNull
    @Size(max = 255)
    private String name;
    @Size(max = 255)
    private String description;
    @NotNull
    @Size(max = 255)
    private String subject;
    private String bodyHtml;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;
    private UUID tenantOrganization;

    @Default
    public EmailTemplateDto(UUID emailTemplateId, String name, String description, String subject, String bodyHtml,
                            LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.emailTemplateId = emailTemplateId;
        this.name = name;
        this.description = description;
        this.subject = subject;
        this.bodyHtml = bodyHtml;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    @JsonCreator
    public EmailTemplateDto(UUID emailTemplateId, String name, String description, String subject, String bodyHtml,
                            LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.emailTemplateId = emailTemplateId;
        this.name = name;
        this.description = description;
        this.subject = subject;
        this.bodyHtml = bodyHtml;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
    }

    public UUID getEmailTemplateId() {
        return emailTemplateId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getSubject() {
        return subject;
    }

    public String getBodyHtml() {
        return bodyHtml;
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
