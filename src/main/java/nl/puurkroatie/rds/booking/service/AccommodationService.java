package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.AccommodationDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccommodationService {

    AccommodationDto create(AccommodationDto dto);

    AccommodationDto update(UUID id, AccommodationDto dto);

    void delete(UUID id);

    List<AccommodationDto> findAll();

    Optional<AccommodationDto> findById(UUID id);
}
