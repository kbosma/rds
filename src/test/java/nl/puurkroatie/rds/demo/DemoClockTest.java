package nl.puurkroatie.rds.demo;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DemoClockTest {

    private static final ZoneId AMSTERDAM = ZoneId.of("Europe/Amsterdam");

    @Test
    void startsAtTheRealDate() {
        DemoClock clock = new DemoClock(AMSTERDAM);

        assertEquals(LocalDate.now(Clock.system(AMSTERDAM)), LocalDate.now(clock));
    }

    @Test
    void setToday_movesTheDate_andResetGoesBack() {
        DemoClock clock = new DemoClock(AMSTERDAM);

        clock.setToday(LocalDate.of(2027, 7, 12));
        assertEquals(LocalDate.of(2027, 7, 12), LocalDate.now(clock));

        clock.reset();
        assertEquals(LocalDate.now(Clock.system(AMSTERDAM)), LocalDate.now(clock));
    }

    @Test
    void setToday_lateInTheEveningInWinter_toSummerDate_keepsTheRequestedDate() {
        Clock base = fixedAt(LocalDateTime.of(2026, 11, 18, 23, 36));
        DemoClock clock = new DemoClock(base, AMSTERDAM);

        clock.setToday(LocalDate.of(2027, 7, 12));

        assertEquals(LocalDate.of(2027, 7, 12), LocalDate.now(clock));
        assertEquals(LocalTime.of(23, 36), LocalTime.now(clock));
    }

    @Test
    void setToday_lateInTheEveningInSummer_toWinterDate_keepsTheRequestedDate() {
        Clock base = fixedAt(LocalDateTime.of(2027, 7, 12, 23, 30));
        DemoClock clock = new DemoClock(base, AMSTERDAM);

        clock.setToday(LocalDate.of(2027, 1, 15));

        assertEquals(LocalDate.of(2027, 1, 15), LocalDate.now(clock));
        assertEquals(LocalTime.of(23, 30), LocalTime.now(clock));
    }

    @Test
    void setToday_justAfterMidnight_toSummerDate_keepsTheRequestedDate() {
        Clock base = fixedAt(LocalDateTime.of(2026, 11, 18, 0, 15));
        DemoClock clock = new DemoClock(base, AMSTERDAM);

        clock.setToday(LocalDate.of(2027, 7, 12));

        assertEquals(LocalDate.of(2027, 7, 12), LocalDate.now(clock));
    }

    @Test
    void setToday_toTheDaySummerTimeStarts_duringTheSkippedHour_keepsTheRequestedDate() {
        Clock base = fixedAt(LocalDateTime.of(2026, 11, 18, 2, 30));
        DemoClock clock = new DemoClock(base, AMSTERDAM);

        clock.setToday(LocalDate.of(2027, 3, 28));

        assertEquals(LocalDate.of(2027, 3, 28), LocalDate.now(clock));
    }

    @Test
    void shiftedClock_keepsRunning_andRollsOverAtLocalMidnight() {
        MutableClock base = new MutableClock(fixedAt(LocalDateTime.of(2026, 11, 18, 23, 30)).instant());
        DemoClock clock = new DemoClock(base, AMSTERDAM);
        clock.setToday(LocalDate.of(2027, 7, 12));

        base.advance(Duration.ofMinutes(29));
        assertEquals(LocalDate.of(2027, 7, 12), LocalDate.now(clock));

        base.advance(Duration.ofMinutes(2));
        assertEquals(LocalDate.of(2027, 7, 13), LocalDate.now(clock));
    }

    @Test
    void withZone_sharesTheShift() {
        DemoClock clock = new DemoClock(AMSTERDAM);
        Clock utc = clock.withZone(ZoneId.of("UTC"));

        clock.setToday(LocalDate.of(2030, 1, 15));

        assertEquals(LocalDate.of(2030, 1, 15), LocalDate.now(utc.withZone(AMSTERDAM)));
    }

    @Test
    void withZone_lateInTheEvening_givesTheRequestedDateInAmsterdam() {
        Clock base = fixedAt(LocalDateTime.of(2026, 11, 18, 23, 36));
        DemoClock clock = new DemoClock(base, AMSTERDAM);
        Clock utc = clock.withZone(ZoneId.of("UTC"));

        clock.setToday(LocalDate.of(2027, 7, 12));

        assertEquals(LocalDate.of(2027, 7, 12), LocalDate.ofInstant(utc.instant(), AMSTERDAM));
    }

    private static Clock fixedAt(LocalDateTime localDateTime) {
        return Clock.fixed(ZonedDateTime.of(localDateTime, AMSTERDAM).toInstant(), AMSTERDAM);
    }

    /** Een instelbare basisklok, zodat de tijd in de test kan doorlopen. */
    private static final class MutableClock extends Clock {

        private Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return AMSTERDAM;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
