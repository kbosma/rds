package nl.puurkroatie.rds.booking.dto;

import java.util.UUID;

public class BookerAddressDto {

    private UUID bookerId;
    private UUID addressId;

    public BookerAddressDto(UUID bookerId, UUID addressId) {
        this.bookerId = bookerId;
        this.addressId = addressId;
    }

    public UUID getBookerId() {
        return bookerId;
    }

    public UUID getAddressId() {
        return addressId;
    }
}
