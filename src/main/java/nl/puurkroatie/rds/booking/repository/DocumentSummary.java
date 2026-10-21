package nl.puurkroatie.rds.booking.repository;

import java.time.LocalDateTime;
import java.util.UUID;

/** Een document zonder de bytes (wel de grootte), voor lijsten waar het bestand zelf niet nodig is. */
public interface DocumentSummary {

    UUID getDocumentId();

    String getDisplayname();

    String getMimeType();

    Long getSize();

    LocalDateTime getCreatedAt();
}
