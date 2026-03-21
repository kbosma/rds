package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.dto.PersonDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PersonService {

    PersonDto create(PersonDto dto);

    PersonDto update(UUID id, PersonDto dto);

    void delete(UUID id);

    List<PersonDto> findAll();

    Optional<PersonDto> findById(UUID id);
}
