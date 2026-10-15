package nl.puurkroatie.rds.email.service;

/**
 * Gegooid wanneer een e-mail niet verstuurd kan worden door ontbrekende
 * gegevens: de organisatie heeft geen afzenderadres of de booker geen
 * e-mailadres. Valt via de global exception handler terug op HTTP 400.
 */
public class EmailNotConfiguredException extends RuntimeException {

    public EmailNotConfiguredException(String message) {
        super(message);
    }
}
