package nl.puurkroatie.rds.common;

/**
 * Een betaling die al bij Mollie bestaat (er is een Mollie-id) is geschiedenis en mag niet meer gewijzigd worden.
 * Wordt vertaald naar HTTP 409.
 */
public class PaymentLockedException extends RuntimeException {

    public PaymentLockedException(String message) {
        super(message);
    }
}
