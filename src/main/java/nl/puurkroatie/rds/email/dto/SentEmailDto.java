package nl.puurkroatie.rds.email.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/** Een verzonden e-mail zoals hij bewaard is, met de leesbare naam van de medewerker die hem verstuurde. */
public record SentEmailDto(
        UUID sentEmailId,
        UUID bookingId,
        String fromAddress,
        String toAddress,
        String subject,
        String bodyHtml,
        UUID resentFromId,
        LocalDateTime createdAt,
        UUID createdBy,
        String createdByName) {
}
