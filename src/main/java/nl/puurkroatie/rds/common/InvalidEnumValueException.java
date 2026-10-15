package nl.puurkroatie.rds.common;

/**
 * Gegooid wanneer een tekstwaarde niet naar een enum-constante vertaald kan worden
 * (bv. gender "F" i.p.v. "man"/"vrouw"/"anders"). De boodschap noemt de ongeldige
 * waarde en de toegestane waarden, zodat een API-gebruiker direct ziet wat er mis is.
 *
 * Erft bewust van {@link IllegalArgumentException}: dat is wat {@code Enum.valueOf}
 * eerder gooide, dus bestaande aanroepers en tests blijven werken. De global
 * exception handler vertaalt dit naar HTTP 400.
 */
public class InvalidEnumValueException extends IllegalArgumentException {

    public InvalidEnumValueException(String message) {
        super(message);
    }
}
