package nl.puurkroatie.rds.booking.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class BookerAddressDto {

    @NotNull
    private UUID bookerId;
    @NotNull
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
