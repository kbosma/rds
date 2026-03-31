package nl.puurkroatie.rds.booking.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class AccommodationSupplierDto {

    @NotNull
    private UUID accommodationId;
    @NotNull
    private UUID supplierId;

    public AccommodationSupplierDto(UUID accommodationId, UUID supplierId) {
        this.accommodationId = accommodationId;
        this.supplierId = supplierId;
    }

    public UUID getAccommodationId() {
        return accommodationId;
    }

    public UUID getSupplierId() {
        return supplierId;
    }
}
