package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "activity")
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "activity_id")
    private UUID activityId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_type", nullable = false)
    private ActivityType activityType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @Column(name = "modified_at")
    private LocalDateTime modifiedAt;

    @Column(name = "modified_by")
    private UUID modifiedBy;

    @Column(name = "tenant_organization", nullable = false, updatable = false)
    private UUID tenantOrganization;

    protected Activity() {
    }

    public Activity(UUID activityId, String name, String description, ActivityType activityType) {
        this.activityId = activityId;
        this.name = name;
        this.description = description;
        this.activityType = activityType;
    }

    @Default
    public Activity(String name, String description, ActivityType activityType) {
        this.name = name;
        this.description = description;
        this.activityType = activityType;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.createdBy = TenantContext.getAccountId();
        this.tenantOrganization = TenantContext.getOrganizationId();
    }

    @PreUpdate
    protected void onUpdate() {
        this.modifiedAt = LocalDateTime.now();
        this.modifiedBy = TenantContext.getAccountId();
    }

    public UUID getActivityId() {
        return activityId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public ActivityType getActivityType() {
        return activityType;
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

    public UUID getTenantOrganization() {
        return tenantOrganization;
    }
}
