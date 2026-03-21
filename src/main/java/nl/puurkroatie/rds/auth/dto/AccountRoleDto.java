package nl.puurkroatie.rds.auth.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class AccountRoleDto {

    private UUID accountId;
    private UUID roleId;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;

    public AccountRoleDto(UUID accountId, UUID roleId, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.accountId = accountId;
        this.roleId = roleId;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public UUID getRoleId() {
        return roleId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public LocalDateTime getModifiedAt() {
        return modifiedAt;
    }

    public UUID getModifiedBy() {
        return modifiedBy;
    }
}