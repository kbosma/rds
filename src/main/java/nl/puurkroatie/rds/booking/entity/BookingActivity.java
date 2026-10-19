package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import nl.puurkroatie.rds.auth.security.TenantContext;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "booking_activity")
public class BookingActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "booking_activity_id")
    private UUID bookingActivityId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Activity activity;

    @Column(name = "activity_date")
    private LocalDate activityDate;

    @Column(name = "from_time")
    private LocalTime fromTime;

    @Column(name = "until_time")
    private LocalTime untilTime;

    @Column(name = "meeting_point")
    private String meetingPoint;

    @Column(name = "total_price")
    private BigDecimal totalPrice;

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

    protected BookingActivity() {
    }

    public BookingActivity(Booking booking, Activity activity, LocalDate activityDate, LocalTime fromTime,
                           LocalTime untilTime, String meetingPoint, BigDecimal totalPrice) {
        this.booking = booking;
        this.activity = activity;
        this.activityDate = activityDate;
        this.fromTime = fromTime;
        this.untilTime = untilTime;
        this.meetingPoint = meetingPoint;
        this.totalPrice = totalPrice;
    }

    public BookingActivity(UUID bookingActivityId, Booking booking, Activity activity, LocalDate activityDate,
                           LocalTime fromTime, LocalTime untilTime, String meetingPoint, BigDecimal totalPrice) {
        this.bookingActivityId = bookingActivityId;
        this.booking = booking;
        this.activity = activity;
        this.activityDate = activityDate;
        this.fromTime = fromTime;
        this.untilTime = untilTime;
        this.meetingPoint = meetingPoint;
        this.totalPrice = totalPrice;
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

    public UUID getBookingActivityId() {
        return bookingActivityId;
    }

    public Booking getBooking() {
        return booking;
    }

    public Activity getActivity() {
        return activity;
    }

    public LocalDate getActivityDate() {
        return activityDate;
    }

    public LocalTime getFromTime() {
        return fromTime;
    }

    public LocalTime getUntilTime() {
        return untilTime;
    }

    /** Begin van de activiteit, of null als datum of van-tijd ontbreekt. */
    public LocalDateTime getStartDateTime() {
        return activityDate != null && fromTime != null ? activityDate.atTime(fromTime) : null;
    }

    /** Einde van de activiteit; een tot-tijd vóór de van-tijd betekent dat de activiteit de volgende dag eindigt. */
    public LocalDateTime getEndDateTime() {
        if (activityDate == null || untilTime == null) {
            return null;
        }
        boolean endsNextDay = fromTime != null && untilTime.isBefore(fromTime);
        return (endsNextDay ? activityDate.plusDays(1) : activityDate).atTime(untilTime);
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
