package nl.puurkroatie.rds.booking.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/** Een geregistreerde herkoppeling van een betaling, met leesbare boekingnummers en de naam van wie het deed. */
public class PaymentRelinkDto {

    private final UUID relinkId;
    private final UUID molliePaymentId;
    private final UUID fromBookingId;
    private final String fromBookingNumber;
    private final UUID toBookingId;
    private final String toBookingNumber;
    private final String reason;
    private final LocalDateTime createdAt;
    private final UUID createdBy;
    private final String createdByName;

    public PaymentRelinkDto(UUID relinkId, UUID molliePaymentId, UUID fromBookingId, String fromBookingNumber,
                            UUID toBookingId, String toBookingNumber, String reason, LocalDateTime createdAt,
                            UUID createdBy, String createdByName) {
        this.relinkId = relinkId;
        this.molliePaymentId = molliePaymentId;
        this.fromBookingId = fromBookingId;
        this.fromBookingNumber = fromBookingNumber;
        this.toBookingId = toBookingId;
        this.toBookingNumber = toBookingNumber;
        this.reason = reason;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.createdByName = createdByName;
    }

    public UUID getRelinkId() {
        return relinkId;
    }

    public UUID getMolliePaymentId() {
        return molliePaymentId;
    }

    public UUID getFromBookingId() {
        return fromBookingId;
    }

    public String getFromBookingNumber() {
        return fromBookingNumber;
    }

    public UUID getToBookingId() {
        return toBookingId;
    }

    public String getToBookingNumber() {
        return toBookingNumber;
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

    public String getCreatedByName() {
        return createdByName;
    }
}
