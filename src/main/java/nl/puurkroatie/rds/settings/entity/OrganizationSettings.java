package nl.puurkroatie.rds.settings.entity;

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

/**
 * De instellingen van één organisatie: keuzes die het systeem nodig heeft om zelf iets te doen, zoals welke
 * Word-template de offerte is en welke e-mailtemplate de offerte begeleidt. Eén rij per organisatie; onveranderlijk
 * (bijwerken = een nieuwe instantie met hetzelfde id opslaan).
 */
@Entity
@Table(name = "organization_settings")
public class OrganizationSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "organization_settings_id")
    private UUID organizationSettingsId;

    @Column(name = "organization_id", nullable = false, unique = true, updatable = false)
    private UUID organizationId;

    @Column(name = "quote_document_template_id")
    private UUID quoteDocumentTemplateId;

    @Column(name = "quote_email_template_id")
    private UUID quoteEmailTemplateId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @Column(name = "modified_at")
    private LocalDateTime modifiedAt;

    @Column(name = "modified_by")
    private UUID modifiedBy;

    protected OrganizationSettings() {
    }

    /** Nieuwe instellingen voor een organisatie. */
    public OrganizationSettings(UUID organizationId, UUID quoteDocumentTemplateId, UUID quoteEmailTemplateId) {
        this.organizationId = organizationId;
        this.quoteDocumentTemplateId = quoteDocumentTemplateId;
        this.quoteEmailTemplateId = quoteEmailTemplateId;
    }

    /** Bijgewerkte instellingen: id en aanmaakgegevens blijven, de keuzes zijn nieuw. */
    public OrganizationSettings withQuoteTemplates(UUID quoteDocumentTemplateId, UUID quoteEmailTemplateId) {
        OrganizationSettings updated = new OrganizationSettings(organizationId, quoteDocumentTemplateId, quoteEmailTemplateId);
        updated.organizationSettingsId = organizationSettingsId;
        updated.createdAt = createdAt;
        updated.createdBy = createdBy;
        return updated;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.createdBy = TenantContext.getAccountId();
    }

    @PreUpdate
    protected void onUpdate() {
        this.modifiedAt = LocalDateTime.now();
        this.modifiedBy = TenantContext.getAccountId();
    }

    public UUID getOrganizationSettingsId() {
        return organizationSettingsId;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getQuoteDocumentTemplateId() {
        return quoteDocumentTemplateId;
    }

    public UUID getQuoteEmailTemplateId() {
        return quoteEmailTemplateId;
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
