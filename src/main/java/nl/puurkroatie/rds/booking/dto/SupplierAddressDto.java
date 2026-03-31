package nl.puurkroatie.rds.booking.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class SupplierAddressDto {

    @NotNull
    private UUID supplierId;
    @NotNull
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
