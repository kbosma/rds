package nl.puurkroatie.rds.booking.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class BookingMolliePaymentDto {

    @NotNull
    private UUID bookingId;
    @NotNull
    private UUID molliePaymentId;

    public BookingMolliePaymentDto(UUID bookingId, UUID molliePaymentId) {
        this.bookingId = bookingId;
        this.molliePaymentId = molliePaymentId;
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public UUID getMolliePaymentId() {
        return molliePaymentId;
    }
}
