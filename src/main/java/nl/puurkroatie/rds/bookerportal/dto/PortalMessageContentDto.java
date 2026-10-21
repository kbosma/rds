package nl.puurkroatie.rds.bookerportal.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/** Een verzonden e-mail zoals de klant hem ontving: onderwerp, afzender, tijdstip en de HTML zoals verstuurd. */
public record PortalMessageContentDto(
        UUID messageId,
        String subject,
        String fromAddress,
        boolean resent,
        LocalDateTime createdAt,
        String bodyHtml) {
}
