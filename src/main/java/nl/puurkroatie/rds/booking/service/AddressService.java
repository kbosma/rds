package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.AddressDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AddressService {

    AddressDto create(AddressDto dto);

    AddressDto update(UUID id, AddressDto dto);

    void delete(UUID id);

    List<AddressDto> findAll();

    Optional<AddressDto> findById(UUID id);
}
