package nl.puurkroatie.rds.docgen.service;

import nl.puurkroatie.rds.docgen.context.BookerContext;
import nl.puurkroatie.rds.docgen.context.BookingContext;

import java.util.UUID;

/**
 * Bouwt de gegevens (het "model") waarmee een template wordt samengevoegd. Gedeeld door de
 * documentgeneratie (.docx/PDF) en de e-mailtemplates, zodat beide dezelfde gegevens zien.
 * Controleert de organisatie (tenant) van wat wordt opgehaald.
 */
public interface BookingContextService {

    /** De boeking met boeker, reizigers, accommodaties, leveranciers en activiteiten. */
    BookingContext forBooking(UUID bookingId);

    /** Alleen een persoon (boeker of prospect) met zijn adressen. */
    BookerContext forBooker(UUID bookerId);
}
