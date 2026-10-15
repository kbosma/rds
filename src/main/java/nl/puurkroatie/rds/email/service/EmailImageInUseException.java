package nl.puurkroatie.rds.email.service;

/**
 * Gegooid bij het verwijderen van een afbeelding die nog in een template staat. De global
 * exception handler vertaalt dit naar HTTP 409 (Conflict).
 */
public class EmailImageInUseException extends RuntimeException {

    public EmailImageInUseException() {
        super("The image is used in an e-mail template and cannot be deleted.");
    }
}
