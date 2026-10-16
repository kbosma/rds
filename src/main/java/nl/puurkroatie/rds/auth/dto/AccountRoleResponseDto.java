package nl.puurkroatie.rds.auth.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response voor een koppeling account-rol. Bevat bewust alleen de ids en de rolnaam: nooit het
 * volledige account (wachtwoord-hash, TOTP-geheim, herstelcodes) of de organisatie (Mollie-sleutel).
 * De geneste vorm (account.accountId, role.roleId/description) is wat de frontend gebruikt.
 */
public class AccountRoleResponseDto {

    private final AccountRef account;
    private final RoleRef role;
    private final LocalDateTime createdAt;
    private final UUID createdBy;
    private final LocalDateTime modifiedAt;
    private final UUID modifiedBy;

    public AccountRoleResponseDto(AccountRef account, RoleRef role, LocalDateTime createdAt, UUID createdBy,
                                  LocalDateTime modifiedAt, UUID modifiedBy) {
        this.account = account;
        this.role = role;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
    }

    public AccountRef getAccount() {
        return account;
    }

    public RoleRef getRole() {
        return role;
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

    public static class AccountRef {

        private final UUID accountId;

        public AccountRef(UUID accountId) {
            this.accountId = accountId;
        }

        public UUID getAccountId() {
            return accountId;
        }
    }

    public static class RoleRef {

        private final UUID roleId;
        private final String description;

        public RoleRef(UUID roleId, String description) {
            this.roleId = roleId;
            this.description = description;
        }

        public UUID getRoleId() {
            return roleId;
        }

        public String getDescription() {
            return description;
        }
    }
}
