package nl.puurkroatie.rds.bookerportal.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/** Een verzonden e-mail in de lijst: zonder de inhoud en zonder adressen of namen van medewerkers. */
public record PortalMessageDto(
        UUID messageId,
        String subject,
        String fromAddress,
        boolean resent,
        LocalDateTime createdAt) {
}
