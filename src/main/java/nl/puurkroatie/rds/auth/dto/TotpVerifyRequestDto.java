package nl.puurkroatie.rds.auth.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class TotpVerifyRequestDto {

    @NotNull
    @Pattern(regexp = "\\d{6}", message = "TOTP code must be 6 digits")
    private final String totpCode;

    public TotpVerifyRequestDto(String totpCode) {
        this.totpCode = totpCode;
    }

    public String getTotpCode() {
        return totpCode;
    }
}
