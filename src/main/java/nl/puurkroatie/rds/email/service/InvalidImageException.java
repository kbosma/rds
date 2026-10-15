package nl.puurkroatie.rds.email.service;

/**
 * Gegooid wanneer een geüploade afbeelding niet geaccepteerd wordt (leeg, te groot
 * of geen ondersteund type). De boodschap is bedoeld voor de gebruiker; de global
 * exception handler vertaalt dit naar HTTP 400.
 */
public class InvalidImageException extends RuntimeException {

    public InvalidImageException(String message) {
        super(message);
    }
}
