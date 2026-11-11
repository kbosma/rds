package nl.puurkroatie.rds.quote.dto;

import java.util.UUID;

/** Uitkomst van "offerte versturen": de nieuwe status, het gemaakte document en naar wie de mail ging. */
public record QuoteSendResultDto(
        UUID bookingId,
        String bookingStatus,
        UUID documentId,
        String documentName,
        String to,
        String subject) {
}
