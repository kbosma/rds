package nl.puurkroatie.rds.mollie.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import nl.puurkroatie.rds.common.Default;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class MolliePaymentDto {

    private UUID molliePaymentId;
    private String molliePaymentExternalId;
    private String status;
    private MolliePaymentMethod method;
    @NotNull
    private BigDecimal amount;
    @NotNull
    @Size(max = 3)
    private String currency;
    @NotNull
    @Size(max = 255)
    private String description;
    private String checkoutUrl;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;
    private UUID tenantOrganization;

    @Default
    @JsonCreator
    public MolliePaymentDto(UUID molliePaymentId, String molliePaymentExternalId, String status, MolliePaymentMethod method, BigDecimal amount, String currency, String description, String checkoutUrl, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.molliePaymentId = molliePaymentId;
        this.molliePaymentExternalId = molliePaymentExternalId;
        this.status = status;
        this.method = method;
        this.amount = amount;
        this.currency = currency;
        this.description = description;
        this.checkoutUrl = checkoutUrl;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public MolliePaymentDto(String molliePaymentExternalId, String status, MolliePaymentMethod method, BigDecimal amount, String currency, String description, String checkoutUrl, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.molliePaymentExternalId = molliePaymentExternalId;
        this.status = status;
        this.method = method;
        this.amount = amount;
        this.currency = currency;
        this.description = description;
        this.checkoutUrl = checkoutUrl;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public UUID getMolliePaymentId() {
        return molliePaymentId;
    }

    public String getMolliePaymentExternalId() {
        return molliePaymentExternalId;
    }

    public String getStatus() {
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
