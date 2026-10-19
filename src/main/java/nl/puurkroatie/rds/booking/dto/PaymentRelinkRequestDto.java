package nl.puurkroatie.rds.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/** Verzoek om een betaling aan een andere boeking te koppelen. De reden is verplicht (minstens 5 tekens). */
public class PaymentRelinkRequestDto {

    @NotNull
    private UUID targetBookingId;

    @NotBlank
    @Size(min = 5, max = 500)
    private String reason;

    protected PaymentRelinkRequestDto() {
    }

    public PaymentRelinkRequestDto(UUID targetBookingId, String reason) {
        this.targetBookingId = targetBookingId;
        this.reason = reason;
    }

    public UUID getTargetBookingId() {
        return targetBookingId;
    }

    public String getReason() {
        return reason;
    }
}
