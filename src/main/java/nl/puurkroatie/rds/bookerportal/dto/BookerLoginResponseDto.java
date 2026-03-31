package nl.puurkroatie.rds.bookerportal.dto;

import java.util.UUID;

public class BookerLoginResponseDto {

    private final String token;
    private final UUID bookerId;
    private final UUID bookingId;

    public BookerLoginResponseDto(String token, UUID bookerId, UUID bookingId) {
        this.token = token;
        this.bookerId = bookerId;
        this.bookingId = bookingId;
    }

    public String getToken() {
        return token;
    }

    public UUID getBookerId() {
        return bookerId;
    }

    public UUID getBookingId() {
        return bookingId;
    }
}
