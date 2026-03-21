package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.SupplierDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SupplierService {

    SupplierDto create(SupplierDto dto);

    SupplierDto update(UUID id, SupplierDto dto);

    void delete(UUID id);

    List<SupplierDto> findAll();

    Optional<SupplierDto> findById(UUID id);
}
