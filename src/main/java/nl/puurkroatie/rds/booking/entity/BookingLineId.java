package nl.puurkroatie.rds.booking.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class BookingLineId implements Serializable {

    private UUID booking;
    private UUID accommodation;
    private UUID supplier;

    public BookingLineId() {
    }

    public BookingLineId(UUID booking, UUID accommodation, UUID supplier) {
        this.booking = booking;
        this.accommodation = accommodation;
        this.supplier = supplier;
    }

    public UUID getBooking() {
        return booking;
    }

    public UUID getAccommodation() {
        return accommodation;
    }

    public UUID getSupplier() {
        return supplier;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        BookingLineId that = (BookingLineId) o;
        return Objects.equals(booking, that.booking)
                && Objects.equals(accommodation, that.accommodation)
                && Objects.equals(supplier, that.supplier);
    }

    @Override
    public int hashCode() {
        return Objects.hash(booking, accommodation, supplier);
    }
}
