package nl.puurkroatie.rds.email.dto;

/**
 * Resultaat van het mergen van een EmailTemplate met persoon-data: de
 * gerenderde subject en HTML-body (nog niet verzonden — zie Slice 3).
 */
public class EmailRenderDto {

    private final String subject;
    private final String bodyHtml;

    public EmailRenderDto(String subject, String bodyHtml) {
        this.subject = subject;
        this.bodyHtml = bodyHtml;
    }

    public String getSubject() {
        return subject;
    }

    public String getBodyHtml() {
        return bodyHtml;
    }
}
