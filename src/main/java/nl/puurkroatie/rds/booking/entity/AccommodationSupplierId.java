package nl.puurkroatie.rds.booking.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class AccommodationSupplierId implements Serializable {

    private UUID accommodation;
    private UUID supplier;

    public AccommodationSupplierId() {
    }

    public AccommodationSupplierId(UUID accommodation, UUID supplier) {
        this.accommodation = accommodation;
        this.supplier = supplier;
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
        AccommodationSupplierId that = (AccommodationSupplierId) o;
        return Objects.equals(accommodation, that.accommodation) && Objects.equals(supplier, that.supplier);
    }

    @Override
    public int hashCode() {
        return Objects.hash(accommodation, supplier);
    }
}
