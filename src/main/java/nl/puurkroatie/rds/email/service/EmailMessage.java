package nl.puurkroatie.rds.email.service;

/**
 * Immutable waarde-object met een verzendklare e-mail: de (gemergde) subject en
 * HTML-body plus afzender en ontvanger. Dit is geen REST-DTO, maar interne
 * transport tussen de verzendservice en de {@link EmailSender}.
 */
public class EmailMessage {

    private final String from;
    private final String to;
    private final String subject;
    private final String bodyHtml;

    public EmailMessage(String from, String to, String subject, String bodyHtml) {
        this.from = from;
        this.to = to;
        this.subject = subject;
        this.bodyHtml = bodyHtml;
    }

    public String getFrom() {
        return from;
    }

    public String getTo() {
        return to;
    }

    public String getSubject() {
        return subject;
    }

    public String getBodyHtml() {
        return bodyHtml;
    }
}
