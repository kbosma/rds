package nl.puurkroatie.rds.booking.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class BookingMolliePaymentId implements Serializable {

    private UUID booking;
    private UUID molliePayment;

    public BookingMolliePaymentId() {
    }

    public BookingMolliePaymentId(UUID booking, UUID molliePayment) {
        this.booking = booking;
        this.molliePayment = molliePayment;
    }

    public UUID getBooking() {
        return booking;
    }

    public UUID getMolliePayment() {
        return molliePayment;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        BookingMolliePaymentId that = (BookingMolliePaymentId) o;
        return Objects.equals(booking, that.booking) && Objects.equals(molliePayment, that.molliePayment);
    }

    @Override
    public int hashCode() {
        return Objects.hash(booking, molliePayment);
    }
}
