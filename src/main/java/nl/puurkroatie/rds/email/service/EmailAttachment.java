package nl.puurkroatie.rds.email.service;

/** Een bijlage bij een uitgaande e-mail (bv. de offerte-PDF). Interne transport, geen REST-DTO. */
public record EmailAttachment(String filename, String mimeType, byte[] content) {
}
