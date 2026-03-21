package nl.puurkroatie.rds.booking.dto;

import java.util.UUID;

public class SupplierAddressDto {

    private UUID supplierId;
    private UUID addressId;

    public SupplierAddressDto(UUID supplierId, UUID addressId) {
        this.supplierId = supplierId;
        this.addressId = addressId;
    }

    public UUID getSupplierId() {
        return supplierId;
    }

    public UUID getAddressId() {
        return addressId;
    }
}
