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
@Table(name = "organization")
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "organization_id")
    private UUID organizationId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "mollie_key")
    private String mollieKey;

    @Column(name = "email_from")
    private String emailFrom;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @Column(name = "modified_at")
    private LocalDateTime modifiedAt;

    @Column(name = "modified_by")
    private UUID modifiedBy;

    protected Organization() {
    }

    // Update-constructor: neemt audit (createdAt/createdBy) over van de bestaande
    // entity, zodat een update die updatable=false velden niet op null zet in de
    // in-memory entity (en dus in de response).
    public Organization(UUID organizationId, String name, String mollieKey, String emailFrom,
                        LocalDateTime createdAt, UUID createdBy) {
        this.organizationId = organizationId;
        this.name = name;
        this.mollieKey = mollieKey;
        this.emailFrom = emailFrom;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
    }

    @Default
    public Organization(String name, String mollieKey, String emailFrom) {
        this.name = name;
        this.mollieKey = mollieKey;
        this.emailFrom = emailFrom;
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

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getName() {
        return name;
    }

    public String getMollieKey() {
        return mollieKey;
    }

    public String getEmailFrom() {
        return emailFrom;
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