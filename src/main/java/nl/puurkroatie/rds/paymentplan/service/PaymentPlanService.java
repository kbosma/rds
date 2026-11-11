package nl.puurkroatie.rds.paymentplan.service;

import java.util.UUID;

/** Automatische betalingen van een boeking. */
public interface PaymentPlanService {

    /**
     * Maakt de betalingen van het betalingsschema aan (zie {@link PaymentPlan}) en koppelt ze aan de boeking; daarna
     * krijgt de hoofdboeker de betaalmail, als de organisatie er een heeft gekozen. Doet niets als de boeking al
     * betalingen uit het schema heeft.
     */
    void createFor(UUID bookingId);

    /**
     * Rekent het restant (of de definitieve betaling) opnieuw uit na een wijziging van het totaal: totaal min het
     * voorschot. Alleen bij een bevestigde boeking en zolang die betaling nog niet bij Mollie bestaat.
     */
    void recalculateBalance(UUID bookingId);
}
