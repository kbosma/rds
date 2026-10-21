package nl.puurkroatie.rds.bookerportal.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** Een betaling zoals de klant haar ziet, met de huidige status al bepaald door de server. */
public record PortalPaymentDto(
        UUID molliePaymentId,
        String description,
        BigDecimal amount,
        String currency,
        String method,
        String currentStatus,
        LocalDateTime createdAt) {
}
