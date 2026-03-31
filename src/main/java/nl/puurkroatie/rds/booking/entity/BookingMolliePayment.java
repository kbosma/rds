package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;

@Entity
@Table(name = "booking_mollie_payment")
@IdClass(BookingMolliePaymentId.class)
public class BookingMolliePayment {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mollie_payment_id", nullable = false)
    private MolliePayment molliePayment;

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
}
