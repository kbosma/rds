package nl.puurkroatie.rds.booking.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class AccommodationAddressDto {

    @NotNull
    private UUID accommodationId;
    @NotNull
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
