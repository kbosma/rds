package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import nl.puurkroatie.rds.auth.security.TenantContext;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_template")
public class DocumentTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "document_template_id")
    private UUID documentTemplateId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    @Lob
    @Column(name = "template_data")
    private byte[] templateData;

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

    protected DocumentTemplate() {
    }

    public DocumentTemplate(UUID documentTemplateId, String name, String description, byte[] templateData) {
        this.documentTemplateId = documentTemplateId;
        this.name = name;
        this.description = description;
        this.templateData = templateData;
    }

    public DocumentTemplate(String name, String description, byte[] templateData) {
        this.name = name;
        this.description = description;
        this.templateData = templateData;
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
