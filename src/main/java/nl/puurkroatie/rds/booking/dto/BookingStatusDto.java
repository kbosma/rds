package nl.puurkroatie.rds.booking.dto;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.UUID;

public class BookingStatusDto {

    private UUID bookingstatusId;
    private String displayname;

    @JsonCreator
    public BookingStatusDto(UUID bookingstatusId, String displayname) {
        this.bookingstatusId = bookingstatusId;
        this.displayname = displayname;
    }

    public BookingStatusDto(String displayname) {
        this.displayname = displayname;
    }

    public UUID getBookingstatusId() {
        return bookingstatusId;
    }

    public String getDisplayname() {
        return displayname;
    }
}
