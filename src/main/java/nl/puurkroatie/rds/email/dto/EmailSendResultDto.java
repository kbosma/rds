package nl.puurkroatie.rds.email.dto;

/**
 * Resultaat van het versturen van een e-mail: naar wie, met welke afzender en
 * welk (gemergd) onderwerp de mail is verstuurd. Bevat bewust geen body.
 */
public class EmailSendResultDto {

    private final String to;
    private final String from;
    private final String subject;

    public EmailSendResultDto(String to, String from, String subject) {
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
}
