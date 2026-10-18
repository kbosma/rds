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

    /** True bij een handmatige correctie door een medewerker (dan is {@code reason} gevuld). */
    private boolean correction;
    private String reason;

    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;

    /** Leesbare naam van {@code createdBy} (medewerker of boeker); null = systeem (Mollie) of onbekend. Alleen in responses. */
    private String createdByName;

    @Default
    @JsonCreator
    public MolliePaymentStatusEntryDto(UUID molliePaymentStatusEntryId, UUID molliePaymentId, String status, boolean correction, String reason, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.molliePaymentStatusEntryId = molliePaymentStatusEntryId;
        this.molliePaymentId = molliePaymentId;
        this.status = status;
        this.correction = correction;
        this.reason = reason;
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

    public boolean isCorrection() {
        return correction;
    }

    public String getReason() {
        return reason;
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

    public String getCreatedByName() {
        return createdByName;
    }

    /** Kopie met de leesbare naam van degene die de regel aanmaakte. */
    public MolliePaymentStatusEntryDto withCreatedByName(String name) {
        MolliePaymentStatusEntryDto copy = new MolliePaymentStatusEntryDto(
                molliePaymentStatusEntryId, molliePaymentId, status, correction, reason, createdAt, createdBy, modifiedAt, modifiedBy);
        copy.createdByName = name;
        return copy;
    }
}
