package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.dto.OrganizationDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationService {

    OrganizationDto create(OrganizationDto dto);

    OrganizationDto update(UUID id, OrganizationDto dto);

    void delete(UUID id);

    List<OrganizationDto> findAll();

    Optional<OrganizationDto> findById(UUID id);
}
