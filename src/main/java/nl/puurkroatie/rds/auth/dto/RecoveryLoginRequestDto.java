package nl.puurkroatie.rds.auth.dto;

import jakarta.validation.constraints.NotNull;

public class RecoveryLoginRequestDto {

    @NotNull
    private final String tempToken;

    @NotNull
    private final String recoveryCode;

    public RecoveryLoginRequestDto(String tempToken, String recoveryCode) {
        this.tempToken = tempToken;
        this.recoveryCode = recoveryCode;
    }

    public String getTempToken() {
        return tempToken;
    }

    public String getRecoveryCode() {
        return recoveryCode;
    }
}
