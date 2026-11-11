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
 * Word-template de offerte is, en hoe het betalingsschema eruitziet. Eén rij per organisatie; onveranderlijk
 * (bijwerken = een nieuwe instantie met hetzelfde id opslaan). Zonder opgeslagen rij gelden {@link #defaults}.
 */
@Entity
@Table(name = "organization_settings")
public class OrganizationSettings {

    public static final int DEFAULT_DEPOSIT_PERCENTAGE = 30;
    public static final int DEFAULT_DEPOSIT_WEEKS_BEFORE_DEPARTURE = 12;
    public static final int DEFAULT_BALANCE_WEEKS_BEFORE_DEPARTURE = 6;

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

    /** Voorschot als percentage van het totaal (1 tot en met 100). */
    @Column(name = "deposit_percentage", nullable = false)
    private int depositPercentage;

    /** Het voorschot vervalt zoveel weken voor vertrek (of direct, als dat moment al voorbij is). */
    @Column(name = "deposit_weeks_before_departure", nullable = false)
    private int depositWeeksBeforeDeparture;

    /** Het restant vervalt zoveel weken voor vertrek; is dat al voorbij, dan is er één definitieve betaling. */
    @Column(name = "balance_weeks_before_departure", nullable = false)
    private int balanceWeeksBeforeDeparture;

    /** De e-mail waarmee de hoofdboeker zijn betalingen krijgt; leeg = geen mail. */
    @Column(name = "payment_email_template_id")
    private UUID paymentEmailTemplateId;

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

    public OrganizationSettings(UUID organizationId, UUID quoteDocumentTemplateId, UUID quoteEmailTemplateId,
                                int depositPercentage, int depositWeeksBeforeDeparture, int balanceWeeksBeforeDeparture,
                                UUID paymentEmailTemplateId) {
        this.organizationId = organizationId;
        this.quoteDocumentTemplateId = quoteDocumentTemplateId;
        this.quoteEmailTemplateId = quoteEmailTemplateId;
        this.depositPercentage = depositPercentage;
        this.depositWeeksBeforeDeparture = depositWeeksBeforeDeparture;
        this.balanceWeeksBeforeDeparture = balanceWeeksBeforeDeparture;
        this.paymentEmailTemplateId = paymentEmailTemplateId;
    }

    /** De instellingen van een organisatie die nog niets heeft opgeslagen (niet bewaard). */
    public static OrganizationSettings defaults(UUID organizationId) {
        return new OrganizationSettings(organizationId, null, null, DEFAULT_DEPOSIT_PERCENTAGE,
                DEFAULT_DEPOSIT_WEEKS_BEFORE_DEPARTURE, DEFAULT_BALANCE_WEEKS_BEFORE_DEPARTURE, null);
    }

    /** Bijgewerkte instellingen: id en aanmaakgegevens blijven, de keuzes komen uit {@code choices}. */
    public OrganizationSettings withChoicesOf(OrganizationSettings choices) {
        OrganizationSettings updated = new OrganizationSettings(organizationId, choices.quoteDocumentTemplateId,
                choices.quoteEmailTemplateId, choices.depositPercentage, choices.depositWeeksBeforeDeparture,
                choices.balanceWeeksBeforeDeparture, choices.paymentEmailTemplateId);
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

    public int getDepositPercentage() {
        return depositPercentage;
    }

    public int getDepositWeeksBeforeDeparture() {
        return depositWeeksBeforeDeparture;
    }

    public int getBalanceWeeksBeforeDeparture() {
        return balanceWeeksBeforeDeparture;
    }

    public UUID getPaymentEmailTemplateId() {
        return paymentEmailTemplateId;
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
