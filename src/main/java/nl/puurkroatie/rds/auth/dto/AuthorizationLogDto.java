package nl.puurkroatie.rds.auth.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/** Een regel uit het rechtenlogboek (alleen lezen). */
public record AuthorizationLogDto(
        UUID authorizationLogId,
        UUID tenantOrganization,
        String action,
        UUID roleId,
        String roleName,
        String authority,
        UUID accountId,
        String accountUserName,
        String details,
        LocalDateTime createdAt,
        UUID createdBy,
        String createdByName) {
}
