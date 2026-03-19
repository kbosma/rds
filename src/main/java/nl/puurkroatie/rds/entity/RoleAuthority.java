package nl.puurkroatie.rds.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "role_authority")
@IdClass(RoleAuthorityId.class)
public class RoleAuthority {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "authority_id", nullable = false)
    private Authority authority;

    protected RoleAuthority() {
    }

    public RoleAuthority(Role role, Authority authority) {
        this.role = role;
        this.authority = authority;
    }

    public Role getRole() {
        return role;
    }

    public Authority getAuthority() {
        return authority;
    }
}
