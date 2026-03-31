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

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MolliePaymentStatus status;

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

    public MolliePayment(UUID molliePaymentId, String molliePaymentExternalId, MolliePaymentStatus status, MolliePaymentMethod method, BigDecimal amount, String currency, String description, String checkoutUrl) {
        this.molliePaymentId = molliePaymentId;
        this.molliePaymentExternalId = molliePaymentExternalId;
        this.status = status;
        this.method = method;
        this.amount = amount;
        this.currency = currency;
        this.description = description;
        this.checkoutUrl = checkoutUrl;
    }

    @Default
    public MolliePayment(String molliePaymentExternalId, MolliePaymentStatus status, MolliePaymentMethod method, BigDecimal amount, String currency, String description, String checkoutUrl) {
        this.molliePaymentExternalId = molliePaymentExternalId;
        this.status = status;
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
    public MolliePayment(String molliePaymentExternalId, MolliePaymentStatus status, MolliePaymentMethod method, BigDecimal amount, String currency, String description, String checkoutUrl, UUID tenantOrganization) {
        this.molliePaymentExternalId = molliePaymentExternalId;
        this.status = status;
        this.method = method;
        this.amount = amount;
        this.currency = currency;
        this.description = description;
        this.checkoutUrl = checkoutUrl;
        this.tenantOrganization = tenantOrganization;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.createdBy = TenantContext.getAccountId();
        if (this.tenantOrganization == null) {
            this.tenantOrganization = TenantContext.getOrganizationId();
        }
        this.status = MolliePaymentStatus.OPEN;
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

    public MolliePaymentStatus getStatus() {
        return status;
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

    public UUID getTenantOrganization() {
        return tenantOrganization;
    }
}
