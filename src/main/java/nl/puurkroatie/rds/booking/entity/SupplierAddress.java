package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "supplier_address")
@IdClass(SupplierAddressId.class)
public class SupplierAddress {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "address_id", nullable = false)
    private Address address;

    protected SupplierAddress() {
    }

    public SupplierAddress(Supplier supplier, Address address) {
        this.supplier = supplier;
        this.address = address;
    }

    public Supplier getSupplier() {
        return supplier;
    }

    public Address getAddress() {
        return address;
    }
}
