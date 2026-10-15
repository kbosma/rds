package nl.puurkroatie.rds.email.dto;

import java.util.UUID;

/**
 * Resultaat van een afbeelding-upload. {@code url} is het relatieve publieke pad
 * (bv. /api/public/email-images/{id}); dat wordt in de template-HTML opgeslagen en
 * pas bij het versturen omgezet naar een absolute URL.
 */
public class EmailImageDto {

    private final UUID emailImageId;
    private final String url;
    private final String originalFilename;
    private final String contentType;
    private final long sizeBytes;

    public EmailImageDto(UUID emailImageId, String url, String originalFilename, String contentType, long sizeBytes) {
        this.emailImageId = emailImageId;
        this.url = url;
        this.originalFilename = originalFilename;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
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
}
