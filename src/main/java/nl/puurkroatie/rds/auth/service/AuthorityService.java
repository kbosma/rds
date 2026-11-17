package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.dto.AuthorityDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Authorities liggen vast (alleen via Flyway); deze service leest ze alleen. */
public interface AuthorityService {

    List<AuthorityDto> findAll();

    Optional<AuthorityDto> findById(UUID id);

    /** G(u): de authorities die de ingelogde gebruiker aan een rol mag geven. */
    List<AuthorityDto> findGrantable();
}
