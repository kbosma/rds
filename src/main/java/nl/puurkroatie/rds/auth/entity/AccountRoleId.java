package nl.puurkroatie.rds.auth.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class AccountRoleId implements Serializable {

    private UUID account;
    private UUID role;

    public AccountRoleId() {
    }

    public AccountRoleId(UUID account, UUID role) {
        this.account = account;
        this.role = role;
    }

    public UUID getAccount() {
        return account;
    }

    public UUID getRole() {
        return role;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AccountRoleId that = (AccountRoleId) o;
        return Objects.equals(account, that.account) && Objects.equals(role, that.role);
    }

    @Override
    public int hashCode() {
        return Objects.hash(account, role);
    }
}
