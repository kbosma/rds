package nl.puurkroatie.rds.email.service;

import nl.puurkroatie.rds.email.dto.EmailSendResultDto;

import java.util.UUID;

public interface EmailSendService {

    /**
     * Merget de template met de gegevens van de booker en verstuurt de mail naar
     * het e-mailadres van die booker, met de organisatie als afzender. Werkt voor
     * elke booker (PROSPECT of ACTIVE), ongeacht status.
     */
    EmailSendResultDto sendToBooker(UUID templateId, UUID bookerId);

    /**
     * Zoals {@link #sendToBooker}, maar voor een BOEKING: de template wordt met de gegevens van de
     * boeking samengevoegd en naar de hoofdboeker van die boeking gestuurd.
     */
    EmailSendResultDto sendForBooking(UUID templateId, UUID bookingId);
}
