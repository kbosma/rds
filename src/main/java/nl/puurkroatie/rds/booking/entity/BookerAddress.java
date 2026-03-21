package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "booker_address")
@IdClass(BookerAddressId.class)
public class BookerAddress {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booker_id", nullable = false)
    private Booker booker;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "address_id", nullable = false)
    private Address address;

    protected BookerAddress() {
    }

    public BookerAddress(Booker booker, Address address) {
        this.booker = booker;
        this.address = address;
    }

    public Booker getBooker() {
        return booker;
    }

    public Address getAddress() {
        return address;
    }
}
