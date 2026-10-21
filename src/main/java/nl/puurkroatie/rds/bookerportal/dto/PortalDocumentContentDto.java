package nl.puurkroatie.rds.bookerportal.dto;

/** Het bestand van een document, voor de download. */
public record PortalDocumentContentDto(String displayname, String mimeType, byte[] content) {
}
