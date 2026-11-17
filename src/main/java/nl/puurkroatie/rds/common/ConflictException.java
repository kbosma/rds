package nl.puurkroatie.rds.common;

/**
 * De gevraagde wijziging botst met de huidige staat (bijv. de laatste manager van een organisatie intrekken, een
 * rolnaam die al bestaat, of een recht weghalen dat een ander recht in de rol nodig heeft). Wordt een
 * {@code 409 Conflict} met deze boodschap.
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
