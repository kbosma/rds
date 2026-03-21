package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "accommodation_supplier")
@IdClass(AccommodationSupplierId.class)
public class AccommodationSupplier {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accommodation_id", nullable = false)
    private Accommodation accommodation;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    protected AccommodationSupplier() {
    }

    public AccommodationSupplier(Accommodation accommodation, Supplier supplier) {
        this.accommodation = accommodation;
        this.supplier = supplier;
    }

    public Accommodation getAccommodation() {
        return accommodation;
    }

    public Supplier getSupplier() {
        return supplier;
    }
}
