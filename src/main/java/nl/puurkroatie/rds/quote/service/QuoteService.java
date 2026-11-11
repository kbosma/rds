package nl.puurkroatie.rds.quote.service;

import nl.puurkroatie.rds.quote.dto.QuoteSendResultDto;

import java.util.UUID;

public interface QuoteService {

    /**
     * Verstuurt de offerte van een boeking: zet de status op OFFERTE, maakt met de offertetemplate van de organisatie
     * een PDF (zichtbaar in het portaal) en mailt die met de offertemail als bijlage naar de hoofdboeker.
     * Kan herhaald worden zolang de offerte niet bevestigd is. Mislukt een stap, dan blijft alles zoals het was.
     */
    QuoteSendResultDto send(UUID bookingId);
}
