package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "booking_mollie_payment",
        // 1:M: een MolliePayment hoort bij hoogstens één Booking (zie migratie V3).
        uniqueConstraints = @UniqueConstraint(
                name = "uq_booking_mollie_payment_mollie_payment_id",
                columnNames = "mollie_payment_id"
        )
)
@IdClass(BookingMolliePaymentId.class)
public class BookingMolliePayment {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Booking booking;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mollie_payment_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MolliePayment molliePayment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    protected BookingMolliePayment() {
    }

    public BookingMolliePayment(Booking booking, MolliePayment molliePayment) {
        this.booking = booking;
        this.molliePayment = molliePayment;
    }

    public Booking getBooking() {
        return booking;
    }

    public MolliePayment getMolliePayment() {
        return molliePayment;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.createdBy = TenantContext.getAccountId();
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }
}
