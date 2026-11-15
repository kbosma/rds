package nl.puurkroatie.rds.bookingstatus.service;

import nl.puurkroatie.rds.booking.entity.BookingStatus;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * De status die een bevestigde boeking hoort te hebben, als pure berekening:
 * <ul>
 *   <li>niets betaald: BOEKING; een deel betaald (het voorschot): VOORSCHOT;</li>
 *   <li>alles betaald: BETAALD, vanaf de vertrekdatum OPREIS en na de terugkeerdatum WEERTHUIS.</li>
 * </ul>
 * "Betaald" kijkt naar de betalingen uit het betalingsschema; heeft de boeking die niet (een boeking van vóór het
 * schema), dan naar alle betalingen. Zonder betalingen beslist de engine niets.
 */
public final class StatusTarget {

    /** In deze statussen bepaalt het systeem de status; daarbuiten (aanvraag, offerte, afgerond) niet. */
    public static final Set<BookingStatus> ENGINE_STATUSES = EnumSet.of(
            BookingStatus.BOEKING, BookingStatus.VOORSCHOT, BookingStatus.BETAALD, BookingStatus.OPREIS, BookingStatus.WEERTHUIS);

    private StatusTarget() {
    }

    /**
     * @param paid per relevante betaling: of ze (nu) betaald is
     * @return de doelstatus, of {@code current} als de engine niets te zeggen heeft
     */
    public static BookingStatus of(BookingStatus current, List<Boolean> paid, LocalDate departure, LocalDate returnDate, LocalDate today) {
        if (!ENGINE_STATUSES.contains(current) || paid.isEmpty()) {
            return current;
        }
        boolean allPaid = paid.stream().allMatch(Boolean::booleanValue);
        if (!allPaid) {
            return paid.stream().anyMatch(Boolean::booleanValue) ? BookingStatus.VOORSCHOT : BookingStatus.BOEKING;
        }
        if (returnDate != null && today.isAfter(returnDate)) {
            return BookingStatus.WEERTHUIS;
        }
        if (departure != null && !today.isBefore(departure)) {
            return BookingStatus.OPREIS;
        }
        return BookingStatus.BETAALD;
    }
}
