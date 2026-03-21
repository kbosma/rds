package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "accommodation_address")
@IdClass(AccommodationAddressId.class)
public class AccommodationAddress {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accommodation_id", nullable = false)
    private Accommodation accommodation;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "address_id", nullable = false)
    private Address address;

    protected AccommodationAddress() {
    }

    public AccommodationAddress(Accommodation accommodation, Address address) {
        this.accommodation = accommodation;
        this.address = address;
    }

    public Accommodation getAccommodation() {
        return accommodation;
    }

    public Address getAddress() {
        return address;
    }
}
