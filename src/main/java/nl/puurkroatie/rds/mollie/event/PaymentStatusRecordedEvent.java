package nl.puurkroatie.rds.mollie.event;

import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatus;

import java.util.UUID;

/**
 * Er is een nieuwe status van een betaling vastgelegd (via de Mollie-webhook of als correctie). Het pakket
 * {@code mollie} kent geen boekingen; wie de boeking moet bijwerken luistert naar dit event (in dezelfde transactie).
 */
public record PaymentStatusRecordedEvent(UUID molliePaymentId, MolliePaymentStatus status) {
}
