package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.GenderDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GenderService {

    List<GenderDto> findAll();

    Optional<GenderDto> findById(UUID id);
}
