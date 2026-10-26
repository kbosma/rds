package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.entity.BookerStatus;
import nl.puurkroatie.rds.booking.entity.BookingStatus;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BookerStatusUpdaterTest {

    @Test
    void withoutBookings_isProspect() {
        assertEquals(BookerStatus.PROSPECT, BookerStatusUpdater.derive(List.of()));
    }

    @Test
    void withABookingThatIsNotAfgerond_isActive() {
        assertEquals(BookerStatus.ACTIVE, BookerStatusUpdater.derive(List.of(BookingStatus.AFGEROND, BookingStatus.OFFERTE)));
    }

    @Test
    void withOnlyAfgerondBookings_isNietactief() {
        assertEquals(BookerStatus.NIETACTIEF, BookerStatusUpdater.derive(List.of(BookingStatus.AFGEROND, BookingStatus.AFGEROND)));
    }
}
