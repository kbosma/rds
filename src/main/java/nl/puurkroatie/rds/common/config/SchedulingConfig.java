package nl.puurkroatie.rds.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Geplande taken, zoals de nachtelijke statusengine. */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
