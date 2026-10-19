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
import jakarta.persistence.Table;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Een geregistreerde herkoppeling van een betaling van de ene boeking naar de andere: wie, wanneer, van welke naar
 * welke boeking en waarom. Alleen-toevoegen (afgedwongen met triggers, migratie V12): een regel wordt nooit gewijzigd
 * of verwijderd.
 */
@Entity
@Table(name = "booking_mollie_payment_relink")
public class BookingMolliePaymentRelink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "relink_id")
    private UUID relinkId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mollie_payment_id", nullable = false, updatable = false)
    private MolliePayment molliePayment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_booking_id", nullable = false, updatable = false)
    private Booking fromBooking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_booking_id", nullable = false, updatable = false)
    private Booking toBooking;

    @Column(name = "reason", nullable = false, updatable = false)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @Column(name = "tenant_organization", nullable = false, updatable = false)
    private UUID tenantOrganization;

    protected BookingMolliePaymentRelink() {
    }

    public BookingMolliePaymentRelink(MolliePayment molliePayment, Booking fromBooking, Booking toBooking, String reason) {
        this.molliePayment = molliePayment;
        this.fromBooking = fromBooking;
        this.toBooking = toBooking;
        this.reason = reason;
        this.tenantOrganization = molliePayment.getTenantOrganization();
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.createdBy = TenantContext.getAccountId();
    }

    public UUID getRelinkId() {
        return relinkId;
    }

    public MolliePayment getMolliePayment() {
        return molliePayment;
    }

    public Booking getFromBooking() {
        return fromBooking;
    }

    public Booking getToBooking() {
        return toBooking;
    }

    public String getReason() {
        return reason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public UUID getTenantOrganization() {
        return tenantOrganization;
    }
}
