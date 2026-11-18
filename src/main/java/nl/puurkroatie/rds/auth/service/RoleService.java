package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.dto.AuthorityDto;
import nl.puurkroatie.rds.auth.dto.RoleDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Rollen per organisatie; zie docs/voorstel-eigen-rollen.md, §4.6. */
public interface RoleService {

    /**
     * Een eigen rol in de eigen organisatie; optioneel met de rechten van een bestaande rol (ook een systeemrol) als
     * startpunt. Die rechten moet de gebruiker dan allemaal zelf mogen uitdelen. Met {@code dto.authorities} krijgt
     * de rol precies die rechten (plus vereisten), in dezelfde transactie.
     */
    RoleDto create(RoleDto dto, UUID copyFromRoleId);

    /**
     * Hernoemen (alleen als de naam verandert; vraagt ROLE_UPDATE) en, met {@code dto.authorities}, de rechten op die
     * set zetten: alleen het verschil wordt opgeslagen. Alles in één transactie; alleen eigen rollen onder het eigen
     * niveau.
     */
    RoleDto update(UUID id, RoleDto dto);

    /** Alleen eigen rollen onder het eigen niveau, en niet zolang de rol is toegewezen. */
    void delete(UUID id);

    /** De rollen van de eigen organisatie; met PLATFORM_ADMIN van {@code organizationId}, of van alle organisaties. */
    List<RoleDto> findAll(UUID organizationId);

    Optional<RoleDto> findById(UUID id);

    /** Uitdeelbare authorities die nieuw zijn sinds de organisatie ze voor het laatst als gezien markeerde. */
    List<AuthorityDto> findNewAuthorities();

    /** De nieuwe rechten als gezien markeren. */
    void markNewAuthoritiesSeen();
}
