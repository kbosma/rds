package nl.puurkroatie.rds.booking.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class BookingActivityDto {

    private UUID bookingActivityId;

    @NotNull
    private UUID bookingId;
    @NotNull
    private UUID activityId;

    private String activityName;
    private String activityType;

    private LocalDateTime fromDate;
    private LocalDateTime untilDate;
    private String meetingPoint;
    private BigDecimal totalPrice;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;
    private UUID tenantOrganization;

    public BookingActivityDto(UUID bookingActivityId, UUID bookingId, UUID activityId,
                              String activityName, String activityType,
                              LocalDateTime fromDate, LocalDateTime untilDate, String meetingPoint, BigDecimal totalPrice,
                              LocalDateTime createdAt, UUID createdBy,
                              LocalDateTime modifiedAt, UUID modifiedBy,
                              UUID tenantOrganization) {
        this.bookingActivityId = bookingActivityId;
        this.bookingId = bookingId;
        this.activityId = activityId;
        this.activityName = activityName;
        this.activityType = activityType;
        this.fromDate = fromDate;
        this.untilDate = untilDate;
        this.meetingPoint = meetingPoint;
        this.totalPrice = totalPrice;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public UUID getBookingActivityId() {
        return bookingActivityId;
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public UUID getActivityId() {
        return activityId;
    }

    public String getActivityName() {
        return activityName;
    }

    public String getActivityType() {
        return activityType;
    }

    public LocalDateTime getFromDate() {
        return fromDate;
    }

    public LocalDateTime getUntilDate() {
        return untilDate;
    }

    public String getMeetingPoint() {
        return meetingPoint;
    }

    public BigDecimal getTotalPrice() {
        return totalPrice;
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
