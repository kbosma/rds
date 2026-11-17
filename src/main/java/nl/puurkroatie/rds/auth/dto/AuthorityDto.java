package nl.puurkroatie.rds.auth.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Een authority (alleen lezen: authorities komen uit Flyway). {@code requires}: de namen van de authorities die dit
 * recht nodig heeft; het rollenscherm vinkt die automatisch mee aan.
 */
public record AuthorityDto(
        UUID authorityId,
        String description,
        String domain,
        boolean tenantAssignable,
        LocalDate introducedAt,
        List<String> requires) {
}
