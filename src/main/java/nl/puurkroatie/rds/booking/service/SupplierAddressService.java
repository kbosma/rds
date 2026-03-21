package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.SupplierAddressDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SupplierAddressService {

    List<SupplierAddressDto> findAll();

    Optional<SupplierAddressDto> findById(UUID supplierId, UUID addressId);

    SupplierAddressDto create(SupplierAddressDto dto);

    void delete(UUID supplierId, UUID addressId);
}
