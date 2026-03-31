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

    @Column(name = "booking_number", nullable = false)
    private String bookingNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "booking_status", nullable = false)
    private BookingStatus bookingStatus;

    @Column(name = "from_date")
    private LocalDate fromDate;

    @Column(name = "until_date")
    private LocalDate untilDate;

    @Column(name = "total_sum")
    private BigDecimal totalSum;

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

    public Booking(UUID bookingId, Booker booker, String bookingNumber, BookingStatus bookingStatus, LocalDate fromDate, LocalDate untilDate, BigDecimal totalSum) {
        this.bookingId = bookingId;
        this.booker = booker;
        this.bookingNumber = bookingNumber;
        this.bookingStatus = bookingStatus;
        this.fromDate = fromDate;
        this.untilDate = untilDate;
        this.totalSum = totalSum;
    }

    public Booking(Booker booker, String bookingNumber, BookingStatus bookingStatus, LocalDate fromDate, LocalDate untilDate, BigDecimal totalSum) {
        this.booker = booker;
        this.bookingNumber = bookingNumber;
        this.bookingStatus = bookingStatus;
        this.fromDate = fromDate;
        this.untilDate = untilDate;
        this.totalSum = totalSum;
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

    public LocalDate getFromDate() {
        return fromDate;
    }

    public LocalDate getUntilDate() {
        return untilDate;
    }

    public BigDecimal getTotalSum() {
        return totalSum;
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
