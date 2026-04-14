package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.*;

import nl.puurkroatie.rds.auth.security.TenantContext;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "booking")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "booking_id")
    private UUID bookingId;

    @OneToOne(optional = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "booker_id")
    private Booker booker;

    @OneToMany(mappedBy = "booking", fetch = FetchType.LAZY)
    private List<Traveler> travelers = new ArrayList<>();

    @OneToMany(mappedBy = "booking", fetch = FetchType.LAZY)
    private List<BookingLine> bookingLines = new ArrayList<>();

    @OneToMany(mappedBy = "booking", fetch = FetchType.LAZY)
    private List<BookingActivity> bookingActivities = new ArrayList<>();

    @Column(name = "booking_number", nullable = false)
    private String bookingNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "booking_status", nullable = false)
    private BookingStatus bookingStatus;

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

    protected Booking() {
    }

    public Booking(UUID bookingId, Booker booker, String bookingNumber, BookingStatus bookingStatus) {
        this.bookingId = bookingId;
        this.booker = booker;
        this.bookingNumber = bookingNumber;
        this.bookingStatus = bookingStatus;
    }

    public Booking(Booker booker, String bookingNumber, BookingStatus bookingStatus) {
        this.booker = booker;
        this.bookingNumber = bookingNumber;
        this.bookingStatus = bookingStatus;
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

    public UUID getBookingId() {
        return bookingId;
    }

    public Booker getBooker() {
        return booker;
    }

    public List<Traveler> getTravelers() {
        return travelers;
    }

    public String getBookingNumber() {
        return bookingNumber;
    }

    public BookingStatus getBookingStatus() {
        return bookingStatus;
    }

    @Transient
    public LocalDate getFromDate() {
        if (bookingLines == null || bookingLines.isEmpty()) {
            return null;
        }
        return bookingLines.stream()
                .map(BookingLine::getFromDate)
                .filter(java.util.Objects::nonNull)
                .min(java.util.Comparator.naturalOrder())
                .orElse(null);
    }

    @Transient
    public LocalDate getUntilDate() {
        if (bookingLines == null || bookingLines.isEmpty()) {
            return null;
        }
        return bookingLines.stream()
                .map(BookingLine::getUntilDate)
                .filter(java.util.Objects::nonNull)
                .max(java.util.Comparator.naturalOrder())
                .orElse(null);
    }

    @Transient
    public BigDecimal getTotalSum() {
        BigDecimal lineSum = BigDecimal.ZERO;
        if (bookingLines != null) {
            lineSum = bookingLines.stream()
                    .map(BookingLine::getPrice)
                    .filter(java.util.Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        BigDecimal activitySum = BigDecimal.ZERO;
        if (bookingActivities != null) {
            activitySum = bookingActivities.stream()
                    .map(BookingActivity::getTotalPrice)
                    .filter(java.util.Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        return lineSum.add(activitySum);
    }

    public List<BookingLine> getBookingLines() {
        return bookingLines;
    }

    public List<BookingActivity> getBookingActivities() {
        return bookingActivities;
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
