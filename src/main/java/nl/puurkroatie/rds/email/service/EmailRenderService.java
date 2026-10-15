package nl.puurkroatie.rds.email.service;

import nl.puurkroatie.rds.email.dto.EmailRenderDto;

import java.util.UUID;

public interface EmailRenderService {

    /**
     * Merget de EmailTemplate (subject + body) met de persoon-data van de booker
     * en geeft de gerenderde subject + HTML terug. Verstuurt niets (zie Slice 3).
     */
    EmailRenderDto render(UUID templateId, UUID bookerId);

    /**
     * Zoals {@link #render}, maar voor een BOEKING: de template kan {@code ${booking.*}} gebruiken
     * (en {@code ${prospect.*}} voor de hoofdboeker). Verstuurt niets.
     */
    EmailRenderDto renderForBooking(UUID templateId, UUID bookingId);
}
