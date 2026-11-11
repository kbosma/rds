package nl.puurkroatie.rds.email.service;

import nl.puurkroatie.rds.booking.entity.Document;

/** Maakt van een opgeslagen document een e-mailbijlage. */
public final class EmailAttachments {

    private EmailAttachments() {
    }

    public static EmailAttachment of(Document document) {
        String mimeType = document.getMimeType() != null ? document.getMimeType() : "application/octet-stream";
        return new EmailAttachment(document.getDisplayname(), mimeType, document.getDocument());
    }
}
