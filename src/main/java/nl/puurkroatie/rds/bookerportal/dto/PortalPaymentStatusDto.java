package nl.puurkroatie.rds.bookerportal.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/** Eén regel uit de statushistorie van een betaling: alleen status en tijdstip, geen interne reden of naam. */
public record PortalPaymentStatusDto(
        UUID molliePaymentId,
        String status,
        LocalDateTime createdAt) {
}
