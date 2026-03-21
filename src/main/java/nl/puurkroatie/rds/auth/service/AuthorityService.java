package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.dto.AuthorityDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuthorityService {

    AuthorityDto create(AuthorityDto dto);

    AuthorityDto update(UUID id, AuthorityDto dto);

    void delete(UUID id);

    List<AuthorityDto> findAll();

    Optional<AuthorityDto> findById(UUID id);
}
