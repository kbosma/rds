package nl.puurkroatie.rds.bookerportal.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/** Een document in de lijst: zonder de bytes. Het bestand zelf gaat via {@code …/documents/{id}/content}. */
public record PortalDocumentDto(
        UUID documentId,
        String displayname,
        String mimeType,
        long size,
        LocalDateTime createdAt) {
}
