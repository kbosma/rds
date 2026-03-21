package nl.puurkroatie.rds.booking.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class AccommodationAddressId implements Serializable {

    private UUID accommodation;
    private UUID address;

    public AccommodationAddressId() {
    }

    public AccommodationAddressId(UUID accommodation, UUID address) {
        this.accommodation = accommodation;
        this.address = address;
    }

    public UUID getAccommodation() {
        return accommodation;
    }

    public UUID getAddress() {
        return address;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AccommodationAddressId that = (AccommodationAddressId) o;
        return Objects.equals(accommodation, that.accommodation) && Objects.equals(address, that.address);
    }

    @Override
    public int hashCode() {
        return Objects.hash(accommodation, address);
    }
}
