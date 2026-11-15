package nl.puurkroatie.rds.bookingstatus.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.BookingStatus;

import java.time.LocalDateTime;
import java.util.UUID;

/** Eén statuswijziging van een boeking, door het systeem of met de hand (met reden). Alleen-toevoegen (V20). */
@Entity
@Table(name = "booking_status_change")
public class BookingStatusChange {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "booking_status_change_id")
    private UUID bookingStatusChangeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, updatable = false)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", nullable = false, updatable = false)
    private BookingStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, updatable = false)
    private BookingStatus toStatus;

    @Column(name = "automatic", nullable = false, updatable = false)
    private boolean automatic;

    @Column(name = "reason", nullable = false, updatable = false)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @Column(name = "tenant_organization", nullable = false, updatable = false)
    private UUID tenantOrganization;

    protected BookingStatusChange() {
    }

    public BookingStatusChange(Booking booking, BookingStatus fromStatus, BookingStatus toStatus, boolean automatic, String reason) {
        this.booking = booking;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.automatic = automatic;
        this.reason = reason;
        this.tenantOrganization = booking.getTenantOrganization();
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.createdBy = TenantContext.getAccountId();
    }

    public UUID getBookingStatusChangeId() { return bookingStatusChangeId; }
    public Booking getBooking() { return booking; }
    public BookingStatus getFromStatus() { return fromStatus; }
    public BookingStatus getToStatus() { return toStatus; }
    public boolean isAutomatic() { return automatic; }
    public String getReason() { return reason; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public UUID getCreatedBy() { return createdBy; }
    public UUID getTenantOrganization() { return tenantOrganization; }
}
