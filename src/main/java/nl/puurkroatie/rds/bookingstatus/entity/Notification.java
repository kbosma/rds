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

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Een notificatie bij een boeking: iets dat een medewerker moet oppakken. Wordt afgehandeld (wie, wanneer), nooit
 * verwijderd. Onveranderlijk: afhandelen levert een kopie op met hetzelfde id.
 */
@Entity
@Table(name = "notification")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "notification_id")
    private UUID notificationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, updatable = false)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, updatable = false)
    private NotificationKind kind;

    @Column(name = "title", nullable = false, updatable = false)
    private String title;

    @Column(name = "notified_at", nullable = false, updatable = false)
    private LocalDateTime notifiedAt;

    @Column(name = "handled", nullable = false)
    private boolean handled;

    @Column(name = "handled_at")
    private LocalDateTime handledAt;

    @Column(name = "handled_by")
    private UUID handledBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @Column(name = "tenant_organization", nullable = false, updatable = false)
    private UUID tenantOrganization;

    protected Notification() {
    }

    public Notification(Booking booking, NotificationKind kind, String title, LocalDateTime notifiedAt) {
        this.booking = booking;
        this.kind = kind;
        this.title = title;
        this.notifiedAt = notifiedAt;
        this.tenantOrganization = booking.getTenantOrganization();
    }

    /** Kopie die afgehandeld is door {@code by} op {@code at}. */
    public Notification handledBy(UUID by, LocalDateTime at) {
        Notification copy = new Notification(booking, kind, title, notifiedAt);
        copy.notificationId = notificationId;
        copy.createdAt = createdAt;
        copy.createdBy = createdBy;
        copy.handled = true;
        copy.handledAt = at;
        copy.handledBy = by;
        return copy;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.createdBy = TenantContext.getAccountId();
    }

    public UUID getNotificationId() { return notificationId; }
    public Booking getBooking() { return booking; }
    public NotificationKind getKind() { return kind; }
    public String getTitle() { return title; }
    public LocalDateTime getNotifiedAt() { return notifiedAt; }
    public boolean isHandled() { return handled; }
    public LocalDateTime getHandledAt() { return handledAt; }
    public UUID getHandledBy() { return handledBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public UUID getCreatedBy() { return createdBy; }
    public UUID getTenantOrganization() { return tenantOrganization; }
}
