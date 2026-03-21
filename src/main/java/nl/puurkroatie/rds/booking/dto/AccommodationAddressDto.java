package nl.puurkroatie.rds.booking.dto;

import java.util.UUID;

public class AccommodationAddressDto {

    private UUID accommodationId;
    private UUID addressId;

    public AccommodationAddressDto(UUID accommodationId, UUID addressId) {
        this.accommodationId = accommodationId;
        this.addressId = addressId;
    }

    public UUID getAccommodationId() {
        return accommodationId;
    }

    public UUID getAddressId() {
        return addressId;
    }
}
