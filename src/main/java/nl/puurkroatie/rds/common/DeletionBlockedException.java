package nl.puurkroatie.rds.common;

/**
 * Gegooid als iets niet verwijderd mag worden omdat het gekoppeld is aan gegevens die als geschiedenis
 * bewaard moeten blijven (documenten, betalingen) of omdat er nog bedrijfsgegevens onder hangen. Wordt door de global exception handler een
 * {@code 409 Conflict} met deze boodschap.
 */
public class DeletionBlockedException extends RuntimeException {

    public DeletionBlockedException(String message) {
        super(message);
    }
}
