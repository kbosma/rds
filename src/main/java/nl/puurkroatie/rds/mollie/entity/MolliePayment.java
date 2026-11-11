package nl.puurkroatie.rds.mollie.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.common.Default;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "mollie_payment")
public class MolliePayment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "mollie_payment_id")
    private UUID molliePaymentId;

    @Column(name = "mollie_payment_external_id")
    private String molliePaymentExternalId;

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "method")
    private MolliePaymentMethod method;

    @Column(name = "description")
    private String description;

    @Column(name = "checkout_url")
    private String checkoutUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false)
    private PaymentType paymentType = PaymentType.OVERIG;

    /** Uiterlijke betaaldatum; leeg bij een betaling zonder termijn. */
    @Column(name = "due_date")
    private LocalDate dueDate;

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

    protected MolliePayment() {
    }

    public MolliePayment(UUID molliePaymentId, String molliePaymentExternalId, MolliePaymentMethod method, BigDecimal amount, String currency, String description, String checkoutUrl) {
        this.molliePaymentId = molliePaymentId;
        this.molliePaymentExternalId = molliePaymentExternalId;
        this.method = method;
        this.amount = amount;
        this.currency = currency;
        this.description = description;
        this.checkoutUrl = checkoutUrl;
    }

    @Default
    public MolliePayment(String molliePaymentExternalId, MolliePaymentMethod method, BigDecimal amount, String currency, String description, String checkoutUrl) {
        this.molliePaymentExternalId = molliePaymentExternalId;
        this.method = method;
        this.amount = amount;
        this.currency = currency;
        this.description = description;
        this.checkoutUrl = checkoutUrl;
    }

    /**
     * Constructor for creating a MolliePayment with explicit tenantOrganization,
     * used when TenantContext is not available (e.g., booker portal context).
     */
    public MolliePayment(String molliePaymentExternalId, MolliePaymentMethod method, BigDecimal amount, String currency, String description, String checkoutUrl, UUID tenantOrganization) {
        this.molliePaymentExternalId = molliePaymentExternalId;
        this.method = method;
        this.amount = amount;
        this.currency = currency;
        this.description = description;
        this.checkoutUrl = checkoutUrl;
        this.tenantOrganization = tenantOrganization;
    }

    /**
     * Een betaling uit het betalingsschema (voorschot, restant of definitief), aangemaakt door het systeem bij het
     * bevestigen van de offerte. Nog niet bij Mollie: dat gebeurt pas als de klant betaalt.
     */
    public static MolliePayment planned(PaymentType paymentType, BigDecimal amount, String currency, String description,
                                        LocalDate dueDate, UUID tenantOrganization) {
        MolliePayment payment = new MolliePayment(null, null, amount, currency, description, null, tenantOrganization);
        payment.paymentType = paymentType;
        payment.dueDate = dueDate;
        return payment;
    }

    /** Kopie met andere gegevens (bewerken van een aankondiging); soort, vervaldatum en Mollie-gegevens blijven. */
    public MolliePayment withDetails(MolliePaymentMethod newMethod, BigDecimal newAmount, String newCurrency, String newDescription) {
        return copy(molliePaymentExternalId, newMethod, newAmount, newCurrency, newDescription, checkoutUrl);
    }

    /** Kopie met het Mollie-id en de checkout-URL, zodra de betaling bij Mollie is aangemaakt. */
    public MolliePayment withMollieReference(String externalId, String newCheckoutUrl) {
        return copy(externalId, method, amount, currency, description, newCheckoutUrl);
    }

    /** Kopie met een ander bedrag (herberekend restant). */
    public MolliePayment withAmount(BigDecimal newAmount) {
        return copy(molliePaymentExternalId, method, newAmount, currency, description, checkoutUrl);
    }

    /** Of de betaling al bij Mollie bestaat; dan is ze geschiedenis en verandert er niets meer aan. */
    public boolean isAtMollie() {
        return molliePaymentExternalId != null && !molliePaymentExternalId.isBlank();
    }

    private MolliePayment copy(String externalId, MolliePaymentMethod newMethod, BigDecimal newAmount, String newCurrency,
                               String newDescription, String newCheckoutUrl) {
        MolliePayment copy = new MolliePayment(molliePaymentId, externalId, newMethod, newAmount, newCurrency, newDescription, newCheckoutUrl);
        copy.paymentType = paymentType;
        copy.dueDate = dueDate;
        copy.createdAt = createdAt;
        copy.createdBy = createdBy;
        copy.tenantOrganization = tenantOrganization;
        return copy;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.createdBy = TenantContext.getAccountId();
        if (this.tenantOrganization == null) {
            this.tenantOrganization = TenantContext.getOrganizationId();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.modifiedAt = LocalDateTime.now();
        this.modifiedBy = TenantContext.getAccountId();
    }

    public UUID getMolliePaymentId() {
        return molliePaymentId;
    }

    public String getMolliePaymentExternalId() {
        return molliePaymentExternalId;
    }

    public MolliePaymentMethod getMethod() {
        return method;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public String getDescription() {
        return description;
    }

    public String getCheckoutUrl() {
        return checkoutUrl;
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

    public PaymentType getPaymentType() {
        return paymentType;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public UUID getTenantOrganization() {
        return tenantOrganization;
    }
}
