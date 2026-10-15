package nl.puurkroatie.rds.email.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Een afbeelding in de bibliotheek (lijst). Zonder bytes; {@code inUse} geeft aan of een
 * template de afbeelding gebruikt (dan mag hij niet verwijderd worden).
 */
public class EmailImageListItemDto {

    private final UUID emailImageId;
    private final String url;
    private final String originalFilename;
    private final String contentType;
    private final long sizeBytes;
    private final LocalDateTime createdAt;
    private final boolean inUse;

    public EmailImageListItemDto(UUID emailImageId, String url, String originalFilename, String contentType,
                                 long sizeBytes, LocalDateTime createdAt, boolean inUse) {
        this.emailImageId = emailImageId;
        this.url = url;
        this.originalFilename = originalFilename;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.createdAt = createdAt;
        this.inUse = inUse;
    }

    public UUID getEmailImageId() {
        return emailImageId;
    }

    public String getUrl() {
        return url;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public boolean isInUse() {
        return inUse;
    }
}
