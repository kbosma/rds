package nl.puurkroatie.rds.demo;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

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
    void withZone_sharesTheShift() {
        DemoClock clock = new DemoClock(AMSTERDAM);
        Clock utc = clock.withZone(ZoneId.of("UTC"));

        clock.setToday(LocalDate.of(2030, 1, 15));

        assertEquals(LocalDate.of(2030, 1, 15), LocalDate.now(utc.withZone(AMSTERDAM)));
    }
}
