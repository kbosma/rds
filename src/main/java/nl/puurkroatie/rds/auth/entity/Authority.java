package nl.puurkroatie.rds.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import nl.puurkroatie.rds.common.Default;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "authority")
public class Authority {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "authority_id")
    private UUID authorityId;

    @Column(name = "description", nullable = false, updatable = false)
    private String description;

    /** Onderwerp voor de rechtenmatrix (BOOKING, PAYMENT, ...). Authorities komen alleen via Flyway. */
    @Column(name = "domain", nullable = false, insertable = false, updatable = false)
    private String domain;

    /** Mag een klantorganisatie dit recht uitdelen? */
    @Column(name = "tenant_assignable", nullable = false, insertable = false, updatable = false)
    private boolean tenantAssignable;

    @Column(name = "introduced_at", nullable = false, insertable = false, updatable = false)
    private LocalDate introducedAt;

    protected Authority() {
    }

    public Authority(UUID authorityId, String description) {
        this.authorityId = authorityId;
        this.description = description;
    }

    @Default
    public Authority(String description) {
        this.description = description;
    }

    public UUID getAuthorityId() {
        return authorityId;
    }

    public String getDescription() {
        return description;
    }

    public String getDomain() {
        return domain;
    }

    public boolean isTenantAssignable() {
        return tenantAssignable;
    }

    public LocalDate getIntroducedAt() {
        return introducedAt;
    }
}
