package nl.puurkroatie.rds.email.entity;

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
@Table(name = "email_template")
public class EmailTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "email_template_id")
    private UUID emailTemplateId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    @Column(name = "subject", nullable = false)
    private String subject;

    @Column(name = "body_html", columnDefinition = "text")
    private String bodyHtml;

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

    protected EmailTemplate() {
    }

    public EmailTemplate(UUID emailTemplateId, String name, String description, String subject, String bodyHtml) {
        this.emailTemplateId = emailTemplateId;
        this.name = name;
        this.description = description;
        this.subject = subject;
        this.bodyHtml = bodyHtml;
    }

    public EmailTemplate(String name, String description, String subject, String bodyHtml) {
        this.name = name;
        this.description = description;
        this.subject = subject;
        this.bodyHtml = bodyHtml;
    }

    // Update-constructor: neemt tenant en audit (createdAt/createdBy) over van de
    // bestaande entity, zodat een update die velden niet wist. tenant_organization
    // en created_* zijn updatable=false; zonder deze waarden zou de in-memory
    // entity ze op null zetten (en een navolgende tenant-check breken).
    public EmailTemplate(UUID emailTemplateId, String name, String description, String subject, String bodyHtml,
                         LocalDateTime createdAt, UUID createdBy, UUID tenantOrganization) {
        this.emailTemplateId = emailTemplateId;
        this.name = name;
        this.description = description;
        this.subject = subject;
        this.bodyHtml = bodyHtml;
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
