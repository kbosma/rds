package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.AccommodationAddressDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccommodationAddressService {

    List<AccommodationAddressDto> findAll();

    Optional<AccommodationAddressDto> findById(UUID accommodationId, UUID addressId);

    AccommodationAddressDto create(AccommodationAddressDto dto);

    void delete(UUID accommodationId, UUID addressId);
}
