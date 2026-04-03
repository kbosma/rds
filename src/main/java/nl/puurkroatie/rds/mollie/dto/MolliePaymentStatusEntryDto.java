package nl.puurkroatie.rds.mollie.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import jakarta.validation.constraints.NotNull;
import nl.puurkroatie.rds.common.Default;

import java.time.LocalDateTime;
import java.util.UUID;

public class MolliePaymentStatusEntryDto {

    private UUID molliePaymentStatusEntryId;

    @NotNull
    private UUID molliePaymentId;

    @NotNull
    private String status;

    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;

    @Default
    @JsonCreator
    public MolliePaymentStatusEntryDto(UUID molliePaymentStatusEntryId, UUID molliePaymentId, String status, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.molliePaymentStatusEntryId = molliePaymentStatusEntryId;
        this.molliePaymentId = molliePaymentId;
        this.status = status;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
    }

    public MolliePaymentStatusEntryDto(UUID molliePaymentId, String status, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.molliePaymentId = molliePaymentId;
        this.status = status;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
    }

    public UUID getMolliePaymentStatusEntryId() {
        return molliePaymentStatusEntryId;
    }

    public UUID getMolliePaymentId() {
        return molliePaymentId;
    }

    public String getStatus() {
        return status;
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
