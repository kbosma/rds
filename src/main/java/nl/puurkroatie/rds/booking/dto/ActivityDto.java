package nl.puurkroatie.rds.booking.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import nl.puurkroatie.rds.common.Default;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

public class ActivityDto {

    private UUID activityId;
    @NotNull
    @Size(max = 255)
    private String name;
    private String description;
    @NotNull
    private String activityType;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;
    private UUID tenantOrganization;

    @Default
    public ActivityDto(UUID activityId, String name, String description, String activityType,
                       LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt,
                       UUID modifiedBy, UUID tenantOrganization) {
        this.activityId = activityId;
        this.name = name;
        this.description = description;
        this.activityType = activityType;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    @JsonCreator
    public ActivityDto(UUID activityId, String name, String description, String activityType,
                       LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt,
                       UUID modifiedBy) {
        this.activityId = activityId;
        this.name = name;
        this.description = description;
        this.activityType = activityType;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
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

    public String getActivityType() {
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
