package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.TravelerDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TravelerService {

    TravelerDto create(TravelerDto dto);

    TravelerDto update(UUID id, TravelerDto dto);

    void delete(UUID id);

    List<TravelerDto> findAll();

    Optional<TravelerDto> findById(UUID id);
}
