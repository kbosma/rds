package nl.puurkroatie.rds.auth.dto;

import java.util.UUID;

public class LoginResponseDto {

    private final String token;
    private final UUID accountId;
    private final UUID organizationId;
    private final Boolean mustChangePassword;

    public LoginResponseDto(String token, UUID accountId, UUID organizationId, Boolean mustChangePassword) {
        this.token = token;
        this.accountId = accountId;
        this.organizationId = organizationId;
        this.mustChangePassword = mustChangePassword;
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
}
