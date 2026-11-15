package nl.puurkroatie.rds.bookingstatus.service;

import nl.puurkroatie.rds.booking.entity.BookingStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** De status die een bevestigde boeking hoort te hebben, uit de betalingen en de reisdatums. */
class StatusTargetTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 11);
    private static final LocalDate DEPARTURE = TODAY.plusWeeks(4);
    private static final LocalDate RETURN = DEPARTURE.plusWeeks(1);

    private static BookingStatus target(BookingStatus current, List<Boolean> paid, LocalDate today) {
        return StatusTarget.of(current, paid, DEPARTURE, RETURN, today);
    }

    @Test
    void nothingPaid_isBoeking() {
        assertEquals(BookingStatus.BOEKING, target(BookingStatus.BOEKING, List.of(false, false), TODAY));
    }

    @Test
    void depositPaid_isVoorschot() {
        assertEquals(BookingStatus.VOORSCHOT, target(BookingStatus.BOEKING, List.of(true, false), TODAY));
    }

    @Test
    void allPaidBeforeDeparture_isBetaald() {
        assertEquals(BookingStatus.BETAALD, target(BookingStatus.VOORSCHOT, List.of(true, true), TODAY));
    }

    @Test
    void allPaidFromDepartureDay_isOpReis_untilTheReturnDay() {
        assertEquals(BookingStatus.OPREIS, target(BookingStatus.BETAALD, List.of(true), DEPARTURE));
        assertEquals(BookingStatus.OPREIS, target(BookingStatus.BETAALD, List.of(true), RETURN));
    }

    @Test
    void allPaidAfterTheReturnDay_isWeerThuis() {
        assertEquals(BookingStatus.WEERTHUIS, target(BookingStatus.OPREIS, List.of(true), RETURN.plusDays(1)));
    }

    @Test
    void notFullyPaid_doesNotTravel_evenAfterDeparture() {
        assertEquals(BookingStatus.VOORSCHOT, target(BookingStatus.VOORSCHOT, List.of(true, false), DEPARTURE.plusDays(1)));
    }

    @Test
    void aChargeback_movesTheStatusBack() {
        assertEquals(BookingStatus.VOORSCHOT, target(BookingStatus.OPREIS, List.of(true, false), DEPARTURE.plusDays(1)));
        assertEquals(BookingStatus.BOEKING, target(BookingStatus.VOORSCHOT, List.of(false, false), TODAY));
    }

    @Test
    void outsideTheEngineStatuses_orWithoutPayments_nothingChanges() {
        assertEquals(BookingStatus.AANVRAAG, target(BookingStatus.AANVRAAG, List.of(true), TODAY));
        assertEquals(BookingStatus.OFFERTE, target(BookingStatus.OFFERTE, List.of(true), TODAY));
        assertEquals(BookingStatus.AFGEROND, target(BookingStatus.AFGEROND, List.of(false), TODAY));
        assertEquals(BookingStatus.VOORSCHOT, target(BookingStatus.VOORSCHOT, List.of(), TODAY));
    }
}
