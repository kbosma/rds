package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.AccommodationSupplierDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccommodationSupplierService {

    List<AccommodationSupplierDto> findAll();

    Optional<AccommodationSupplierDto> findById(UUID accommodationId, UUID supplierId);

    AccommodationSupplierDto create(AccommodationSupplierDto dto);

    void delete(UUID accommodationId, UUID supplierId);
}
