package nl.puurkroatie.rds.auth.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class TotpLoginRequestDto {

    @NotNull
    private final String tempToken;

    @NotNull
    @Pattern(regexp = "\\d{6}", message = "TOTP code must be 6 digits")
    private final String totpCode;

    public TotpLoginRequestDto(String tempToken, String totpCode) {
        this.tempToken = tempToken;
        this.totpCode = totpCode;
    }

    public String getTempToken() {
        return tempToken;
    }

    public String getTotpCode() {
        return totpCode;
    }
}
