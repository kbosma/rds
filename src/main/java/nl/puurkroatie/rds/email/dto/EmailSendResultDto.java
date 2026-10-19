package nl.puurkroatie.rds.email.dto;

/**
 * Resultaat van het versturen van een e-mail: naar wie, met welke afzender en
 * welk (gemergd) onderwerp de mail is verstuurd. De body staat er alleen voor intern gebruik in
 * (opslaan van de verzonden mail) en wordt niet geserialiseerd.
 */
public class EmailSendResultDto {

    private final String to;
    private final String from;
    private final String subject;
    private final String bodyHtml;

    public EmailSendResultDto(String to, String from, String subject) {
        this(to, from, subject, null);
    }

    public EmailSendResultDto(String to, String from, String subject, String bodyHtml) {
        this.bodyHtml = bodyHtml;
        this.to = to;
        this.from = from;
        this.subject = subject;
    }

    public String getTo() {
        return to;
    }

    public String getFrom() {
        return from;
    }

    public String getSubject() {
        return subject;
    }

    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getBodyHtml() {
        return bodyHtml;
    }
}
