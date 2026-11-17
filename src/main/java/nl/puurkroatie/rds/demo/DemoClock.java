package nl.puurkroatie.rds.demo;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Een klok die vooruit (of terug) gezet kan worden, alleen voor het demo-profiel. Hij loopt gewoon door, met een
 * verschuiving ten opzichte van de echte tijd. Zo kan het filmpje "drie maanden later" laten zien zonder te wachten.
 */
public final class DemoClock extends Clock {

    private final ZoneId zone;
    private final AtomicReference<Duration> offset;

    public DemoClock(ZoneId zone) {
        this(zone, new AtomicReference<>(Duration.ZERO));
    }

    private DemoClock(ZoneId zone, AtomicReference<Duration> offset) {
        this.zone = zone;
        this.offset = offset;
    }

    /** Zet de datum van "vandaag" op {@code date}; de tijd van de dag blijft de echte tijd. */
    public void setToday(LocalDate date) {
        LocalDate realToday = LocalDate.now(Clock.system(zone));
        offset.set(Duration.ofDays(date.toEpochDay() - realToday.toEpochDay()));
    }

    /** Terug naar de echte tijd. */
    public void reset() {
        offset.set(Duration.ZERO);
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    @Override
    public Clock withZone(ZoneId newZone) {
        return new DemoClock(newZone, offset);
    }

    @Override
    public Instant instant() {
        return Instant.now().plus(offset.get());
    }
}
