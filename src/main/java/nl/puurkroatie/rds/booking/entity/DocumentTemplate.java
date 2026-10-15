package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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

    @Column(name = "template_data", columnDefinition = "bytea")
    private byte[] templateData;

    // Alleen gevuld bij een template die in de editor is gemaakt (zie V8); een geüploade .docx heeft dit niet.
    @Column(name = "source_html", columnDefinition = "text")
    private String sourceHtml;

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
        this(documentTemplateId, name, description, templateData, null);
    }

    public DocumentTemplate(UUID documentTemplateId, String name, String description, byte[] templateData, String sourceHtml) {
        this.documentTemplateId = documentTemplateId;
        this.name = name;
        this.description = description;
        this.templateData = templateData;
        this.sourceHtml = sourceHtml;
    }

    public DocumentTemplate(String name, String description, byte[] templateData) {
        this(name, description, templateData, null);
    }

    public DocumentTemplate(String name, String description, byte[] templateData, String sourceHtml) {
        this.name = name;
        this.description = description;
        this.templateData = templateData;
        this.sourceHtml = sourceHtml;
    }

    // Update-constructor: neemt tenant en audit (createdAt/createdBy) over van de
    // bestaande entity, zodat een update die updatable=false velden niet op null
    // zet (en een navolgende tenant-check niet breekt).
    public DocumentTemplate(UUID documentTemplateId, String name, String description, byte[] templateData,
                            String sourceHtml, LocalDateTime createdAt, UUID createdBy, UUID tenantOrganization) {
        this.documentTemplateId = documentTemplateId;
        this.name = name;
        this.description = description;
        this.templateData = templateData;
        this.sourceHtml = sourceHtml;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.tenantOrganization = tenantOrganization;
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

    public String getSourceHtml() {
        return sourceHtml;
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
