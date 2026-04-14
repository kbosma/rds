package nl.puurkroatie.rds.auth.dto;

import java.util.UUID;

public class LoginResponseDto {

    private final String token;
    private final UUID accountId;
    private final UUID organizationId;
    private final Boolean mustChangePassword;
    private final Boolean requiresTotp;
    private final Boolean requiresTotpSetup;
    private final String tempToken;

    public LoginResponseDto(String token, UUID accountId, UUID organizationId, Boolean mustChangePassword) {
        this.token = token;
        this.accountId = accountId;
        this.organizationId = organizationId;
        this.mustChangePassword = mustChangePassword;
        this.requiresTotp = null;
        this.requiresTotpSetup = null;
        this.tempToken = null;
    }

    public LoginResponseDto(Boolean requiresTotp, Boolean requiresTotpSetup, String tempToken) {
        this.token = null;
        this.accountId = null;
        this.organizationId = null;
        this.mustChangePassword = null;
        this.requiresTotp = requiresTotp;
        this.requiresTotpSetup = requiresTotpSetup;
        this.tempToken = tempToken;
    }

    public String getToken() {
        return token;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public Boolean getMustChangePassword() {
        return mustChangePassword;
    }

    public Boolean getRequiresTotp() {
        return requiresTotp;
    }

    public Boolean getRequiresTotpSetup() {
        return requiresTotpSetup;
    }

    public String getTempToken() {
        return tempToken;
    }
}
