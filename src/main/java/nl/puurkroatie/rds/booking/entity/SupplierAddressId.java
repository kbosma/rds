package nl.puurkroatie.rds.booking.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class SupplierAddressId implements Serializable {

    private UUID supplier;
    private UUID address;

    public SupplierAddressId() {
    }

    public SupplierAddressId(UUID supplier, UUID address) {
        this.supplier = supplier;
        this.address = address;
    }

    public UUID getSupplier() {
        return supplier;
    }

    public UUID getAddress() {
        return address;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SupplierAddressId that = (SupplierAddressId) o;
        return Objects.equals(supplier, that.supplier) && Objects.equals(address, that.address);
    }

    @Override
    public int hashCode() {
        return Objects.hash(supplier, address);
    }
}
