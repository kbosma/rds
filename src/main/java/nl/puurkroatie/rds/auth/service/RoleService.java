package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.dto.RoleDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Rollen per organisatie; zie docs/voorstel-eigen-rollen.md, §4.6. */
public interface RoleService {

    /** Een eigen rol in de eigen organisatie. */
    RoleDto create(RoleDto dto);

    /** Hernoemen; alleen eigen rollen onder het eigen niveau. */
    RoleDto update(UUID id, RoleDto dto);

    /** Alleen eigen rollen onder het eigen niveau, en niet zolang de rol is toegewezen. */
    void delete(UUID id);

    /** De rollen van de eigen organisatie; met PLATFORM_ADMIN van {@code organizationId}, of van alle organisaties. */
    List<RoleDto> findAll(UUID organizationId);

    Optional<RoleDto> findById(UUID id);
}
