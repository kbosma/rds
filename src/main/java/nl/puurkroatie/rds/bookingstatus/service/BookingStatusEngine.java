package nl.puurkroatie.rds.bookingstatus.service;

import java.util.UUID;

/**
 * Zet de status van bevestigde boekingen op basis van de betalingen en de reisdatums (zie {@link StatusTarget}) en
 * maakt daarbij notificaties aan. Een boeking die weer thuis is en geen openstaande notificaties meer heeft, rondt hij
 * af. Draait na elke nieuwe betaalstatus (webhook, correctie), bij het inloggen van een
 * medewerker (voor diens organisatie), elke nacht (voor alle organisaties) en na het afhandelen van een notificatie.
 */
public interface BookingStatusEngine {

    void evaluate(UUID bookingId);

    void evaluateOrganization(UUID organizationId);

    void evaluateAll();
}
