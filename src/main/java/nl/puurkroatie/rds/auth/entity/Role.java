package nl.puurkroatie.rds.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.common.Default;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "role")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "role_id")
    private UUID roleId;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "tenant_organization", nullable = false, updatable = false)
    private UUID tenantOrganization;

    /** ADMIN, MANAGER of EMPLOYEE voor een vergrendelde systeemrol; leeg voor een eigen rol van de organisatie. */
    @Column(name = "system_key", updatable = false)
    private String systemKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @Column(name = "modified_at")
    private LocalDateTime modifiedAt;

    @Column(name = "modified_by")
    private UUID modifiedBy;

    protected Role() {
    }

    public Role(UUID roleId, String description, UUID tenantOrganization, String systemKey) {
        this.roleId = roleId;
        this.description = description;
        this.tenantOrganization = tenantOrganization;
        this.systemKey = systemKey;
    }

    /** Een nieuwe eigen rol van een organisatie. */
    @Default
    public Role(String description, UUID tenantOrganization) {
        this(null, description, tenantOrganization, null);
    }

    /** Dezelfde rol met een andere naam (alleen voor eigen rollen; de database weigert het voor systeemrollen). */
    public Role renamed(String newDescription) {
        Role renamed = new Role(roleId, newDescription, tenantOrganization, systemKey);
        renamed.createdAt = createdAt;
        renamed.createdBy = createdBy;
        return renamed;
    }

    public boolean isSystemRole() {
        return systemKey != null;
    }

    public UUID getRoleId() {
        return roleId;
    }

    public String getDescription() {
        return description;
    }

    public UUID getTenantOrganization() {
        return tenantOrganization;
    }

    public String getSystemKey() {
        return systemKey;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.createdBy = TenantContext.getAccountId();
    }

    @PreUpdate
    protected void onUpdate() {
        this.modifiedAt = LocalDateTime.now();
        this.modifiedBy = TenantContext.getAccountId();
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
