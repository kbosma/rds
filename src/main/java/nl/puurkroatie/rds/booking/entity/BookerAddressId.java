package nl.puurkroatie.rds.booking.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class BookerAddressId implements Serializable {

    private UUID booker;
    private UUID address;

    public BookerAddressId() {
    }

    public BookerAddressId(UUID booker, UUID address) {
        this.booker = booker;
        this.address = address;
    }

    public UUID getBooker() {
        return booker;
    }

    public UUID getAddress() {
        return address;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        BookerAddressId that = (BookerAddressId) o;
        return Objects.equals(booker, that.booker) && Objects.equals(address, that.address);
    }

    @Override
    public int hashCode() {
        return Objects.hash(booker, address);
    }
}
