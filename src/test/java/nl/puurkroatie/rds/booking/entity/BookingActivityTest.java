package nl.puurkroatie.rds.booking.entity;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class BookingActivityTest {

    private static final LocalDate DAY = LocalDate.of(2026, 7, 2);

    private BookingActivity activity(LocalDate date, LocalTime from, LocalTime until) {
        return new BookingActivity(null, null, date, from, until, null, null);
    }

    @Test
    void sameDayActivityStartsAndEndsOnTheActivityDate() {
        BookingActivity a = activity(DAY, LocalTime.of(9, 0), LocalTime.of(12, 0));
        assertEquals(LocalDateTime.of(2026, 7, 2, 9, 0), a.getStartDateTime());
        assertEquals(LocalDateTime.of(2026, 7, 2, 12, 0), a.getEndDateTime());
    }

    @Test
    void untilTimeBeforeFromTimeMeansTheActivityEndsTheNextDay() {
        BookingActivity a = activity(DAY, LocalTime.of(22, 0), LocalTime.of(2, 0));
        assertEquals(LocalDateTime.of(2026, 7, 2, 22, 0), a.getStartDateTime());
        assertEquals(LocalDateTime.of(2026, 7, 3, 2, 0), a.getEndDateTime());
    }

    @Test
    void missingDateGivesNoDateTimes() {
        BookingActivity a = activity(null, LocalTime.of(9, 0), LocalTime.of(12, 0));
        assertNull(a.getStartDateTime());
        assertNull(a.getEndDateTime());
    }
}
