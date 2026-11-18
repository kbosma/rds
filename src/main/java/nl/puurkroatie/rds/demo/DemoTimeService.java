package nl.puurkroatie.rds.demo;

import nl.puurkroatie.rds.bookingstatus.service.BookingStatusEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

/** Laat in de demo de tijd verstrijken: klok verzetten en daarna de statusengine laten rekenen, zoals 's nachts. */
@Service
@Profile("demo")
public class DemoTimeService {

    private static final Logger log = LoggerFactory.getLogger(DemoTimeService.class);

    private final DemoClock clock;
    private final BookingStatusEngine statusEngine;

    public DemoTimeService(DemoClock clock, BookingStatusEngine statusEngine) {
        this.clock = clock;
        this.statusEngine = statusEngine;
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    public LocalDate setToday(LocalDate date) {
        clock.setToday(date);
        log.info("Demo-klok: vandaag is nu {}", date);
        statusEngine.evaluateAll();
        return today();
    }

    public LocalDate reset() {
        clock.reset();
        statusEngine.evaluateAll();
        return today();
    }
}
