package nl.puurkroatie.rds.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/** De klok van de applicatie (Europe/Amsterdam), als bean zodat tests de datum kunnen vastzetten. */
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock() {
        return Clock.system(java.time.ZoneId.of("Europe/Amsterdam"));
    }
}
