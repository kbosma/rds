package nl.puurkroatie.rds.dto;

import java.util.UUID;

public class LoginResponse {

    private final String token;
    private final UUID accountId;
    private final UUID organizationId;

    public LoginResponse(String token, UUID accountId, UUID organizationId) {
        this.token = token;
        this.accountId = accountId;
        this.organizationId = organizationId;
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
}
