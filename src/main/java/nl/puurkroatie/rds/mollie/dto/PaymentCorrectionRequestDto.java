package nl.puurkroatie.rds.mollie.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Verzoek om een handmatige correctie van de status van een betaling te registreren. Dit voegt een nieuwe regel
 * aan de statushistorie toe; bestaande regels (ook die van Mollie) blijven ongewijzigd.
 */
public class PaymentCorrectionRequestDto {

    @NotBlank
    private String status;

    @NotBlank
    @Size(min = 5, max = 500)
    private String reason;

    protected PaymentCorrectionRequestDto() {
    }

    public PaymentCorrectionRequestDto(String status, String reason) {
        this.status = status;
        this.reason = reason;
    }

    public String getStatus() {
        return status;
    }

    public String getReason() {
        return reason;
    }
}
