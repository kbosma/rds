package nl.puurkroatie.rds.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import nl.puurkroatie.rds.auth.security.TenantContext;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Eén regel in het rechtenlogboek: wie gaf of nam wanneer welk recht of welke rol. Alleen toevoegen; een trigger
 * weigert wijzigen en verwijderen (V24). Namen worden bewaard, zodat een regel leesbaar blijft als de rol of het
 * account later wordt hernoemd of verwijderd.
 */
@Entity
@Table(name = "authorization_log")
public class AuthorizationLog {

    public enum Action {
        ROLE_CREATED, ROLE_RENAMED, ROLE_DELETED, AUTHORITY_ADDED, AUTHORITY_REMOVED, ROLE_ASSIGNED, ROLE_REVOKED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "authorization_log_id")
    private UUID authorizationLogId;

    @Column(name = "tenant_organization", nullable = false, updatable = false)
    private UUID tenantOrganization;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, updatable = false)
    private Action action;

    @Column(name = "role_id", updatable = false)
    private UUID roleId;

    @Column(name = "role_name", updatable = false)
    private String roleName;

    @Column(name = "authority", updatable = false)
    private String authority;

    @Column(name = "account_id", updatable = false)
    private UUID accountId;

    @Column(name = "account_user_name", updatable = false)
    private String accountUserName;

    @Column(name = "details", updatable = false)
    private String details;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    protected AuthorizationLog() {
    }

    public AuthorizationLog(UUID tenantOrganization, Action action, UUID roleId, String roleName, String authority,
                            UUID accountId, String accountUserName, String details) {
        this.tenantOrganization = tenantOrganization;
        this.action = action;
        this.roleId = roleId;
        this.roleName = roleName;
        this.authority = authority;
        this.accountId = accountId;
        this.accountUserName = accountUserName;
        this.details = details;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.createdBy = TenantContext.getAccountId();
    }

    public UUID getAuthorizationLogId() {
        return authorizationLogId;
    }

    public UUID getTenantOrganization() {
        return tenantOrganization;
    }

    public Action getAction() {
        return action;
    }

    public UUID getRoleId() {
        return roleId;
    }

    public String getRoleName() {
        return roleName;
    }

    public String getAuthority() {
        return authority;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public String getAccountUserName() {
        return accountUserName;
    }

    public String getDetails() {
        return details;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }
}
