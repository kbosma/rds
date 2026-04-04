package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.dto.OrganizationThemeDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationThemeService {

    OrganizationThemeDto create(OrganizationThemeDto dto);

    OrganizationThemeDto update(UUID id, OrganizationThemeDto dto);

    void delete(UUID id);

    List<OrganizationThemeDto> findAll();

    Optional<OrganizationThemeDto> findById(UUID id);

    Optional<OrganizationThemeDto> findByOrganizationId(UUID organizationId);
}
