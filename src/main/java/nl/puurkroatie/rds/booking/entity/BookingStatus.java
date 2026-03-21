package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "booking_status")
public class BookingStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "bookingstatus_id")
    private UUID bookingstatusId;

    @Column(name = "displayname", nullable = false)
    private String displayname;

    protected BookingStatus() {
    }

    public BookingStatus(UUID bookingstatusId, String displayname) {
        this.bookingstatusId = bookingstatusId;
        this.displayname = displayname;
    }

    public BookingStatus(String displayname) {
        this.displayname = displayname;
    }

    public UUID getBookingstatusId() {
        return bookingstatusId;
    }

    public String getDisplayname() {
        return displayname;
    }
}
