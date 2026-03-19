package nl.puurkroatie.rds.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class RoleAuthorityId implements Serializable {

    private UUID role;
    private UUID authority;

    public RoleAuthorityId() {
    }

    public RoleAuthorityId(UUID role, UUID authority) {
        this.role = role;
        this.authority = authority;
    }

    public UUID getRole() {
        return role;
    }

    public UUID getAuthority() {
        return authority;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RoleAuthorityId that = (RoleAuthorityId) o;
        return Objects.equals(role, that.role) && Objects.equals(authority, that.authority);
    }

    @Override
    public int hashCode() {
        return Objects.hash(role, authority);
    }
}
