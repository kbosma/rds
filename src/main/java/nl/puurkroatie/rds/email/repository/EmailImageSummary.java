package nl.puurkroatie.rds.email.repository;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Projectie van een afbeelding ZONDER de bytes. Voor lijsten: één afbeelding kan 2 MB zijn,
 * en bij tientallen afbeeldingen mag de lijst niet al die bytes inladen.
 */
public interface EmailImageSummary {

    UUID getEmailImageId();

    String getOriginalFilename();

    String getContentType();

    long getSizeBytes();

    LocalDateTime getCreatedAt();

    UUID getTenantOrganization();
}
