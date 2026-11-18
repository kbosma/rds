package nl.puurkroatie.rds.demo;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Een klok die vooruit (of terug) gezet kan worden, alleen voor het demo-profiel. Hij loopt gewoon door, met een
 * verschuiving ten opzichte van de echte tijd. Zo kan het filmpje "drie maanden later" laten zien zonder te wachten.
 *
 * <p>De verschuiving is een aantal kalenderdagen in de kalenderzone, geen vaste duur: de lokale tijd van de dag
 * blijft gelijk aan de echte tijd, ook als tussen vandaag en de gekozen datum de zomertijd begint of eindigt.
 * Anders zou de datum laat op de avond over middernacht schuiven.
 */
public final class DemoClock extends Clock {

    private final Clock base;
    private final ZoneId calendarZone;
    private final ZoneId zone;
    private final AtomicLong offsetDays;

    public DemoClock(ZoneId zone) {
        this(Clock.system(zone), zone);
    }

    /** Voor tests: een vaste of instelbare basisklok in plaats van de systeemtijd. */
    DemoClock(Clock base, ZoneId zone) {
        this(base, zone, zone, new AtomicLong());
    }

    private DemoClock(Clock base, ZoneId calendarZone, ZoneId zone, AtomicLong offsetDays) {
        this.base = Objects.requireNonNull(base, "base");
        this.calendarZone = Objects.requireNonNull(calendarZone, "calendarZone");
        this.zone = Objects.requireNonNull(zone, "zone");
        this.offsetDays = offsetDays;
    }

    /** Zet de datum van "vandaag" op {@code date}; de tijd van de dag blijft de echte tijd. */
    public void setToday(LocalDate date) {
        Objects.requireNonNull(date, "date");
        LocalDate realToday = LocalDate.ofInstant(base.instant(), calendarZone);
        offsetDays.set(date.toEpochDay() - realToday.toEpochDay());
    }

    /** Terug naar de echte tijd. */
    public void reset() {
        offsetDays.set(0);
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    @Override
    public Clock withZone(ZoneId newZone) {
        return new DemoClock(base, calendarZone, newZone, offsetDays);
    }

    @Override
    public Instant instant() {
        Instant real = base.instant();
        long days = offsetDays.get();
        if (days == 0) {
            return real;
        }
        return ZonedDateTime.ofInstant(real, calendarZone).plusDays(days).toInstant();
    }
}
