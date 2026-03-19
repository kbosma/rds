package nl.puurkroatie.rds.service;

import nl.puurkroatie.rds.dto.RoleDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoleService {

    RoleDto create(RoleDto dto);

    RoleDto update(UUID id, RoleDto dto);

    void delete(UUID id);

    List<RoleDto> findAll();

    Optional<RoleDto> findById(UUID id);
}
