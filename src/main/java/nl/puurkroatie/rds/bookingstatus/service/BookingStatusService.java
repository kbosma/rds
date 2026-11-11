package nl.puurkroatie.rds.bookingstatus.service;

import nl.puurkroatie.rds.booking.dto.BookingDto;
import nl.puurkroatie.rds.bookingstatus.dto.BookingStatusChangeDto;

import java.util.List;
import java.util.UUID;

/** Handmatige statuswijzigingen (terugzetten, afronden) en de statusgeschiedenis. */
public interface BookingStatusService {

    /**
     * Zet de status terug naar een eerdere status, met reden. Zolang er niets betaald is mag dat met
     * BOOKING_STATUS_REVERT, daarna alleen met BOOKING_STATUS_REVERT_PAID. Terug naar AANVRAAG of OFFERTE maakt ook
     * de bevestiging van de offerte ongedaan.
     */
    BookingDto revert(UUID bookingId, String targetStatus, String reason);

    /** Rondt de boeking af (AFGEROND). */
    BookingDto complete(UUID bookingId, String reason);

    /** De statusgeschiedenis, nieuwste eerst. */
    List<BookingStatusChangeDto> history(UUID bookingId);
}
