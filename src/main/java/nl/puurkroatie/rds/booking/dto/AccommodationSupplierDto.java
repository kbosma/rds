package nl.puurkroatie.rds.booking.dto;

import java.util.UUID;

public class AccommodationSupplierDto {

    private UUID accommodationId;
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
