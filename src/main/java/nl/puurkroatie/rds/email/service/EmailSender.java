package nl.puurkroatie.rds.email.service;

/**
 * Verstuurt een verzendklare {@link EmailMessage}. De concrete implementatie
 * (echte SMTP of een log-only variant) wordt op basis van de configuratie
 * gekozen; zie EmailSenderConfig.
 */
public interface EmailSender {

    void send(EmailMessage message);
}
