package nl.puurkroatie.rds.support;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.springframework.boot.test.util.TestPropertyValues;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;

import java.io.IOException;

/**
 * Laat elke Spring-testcontext tegen een eigen, tijdelijke PostgreSQL draaien in plaats van tegen de
 * lokale ontwikkeldatabase (rdsdb). Zo hangen de tests niet af van wat er lokaal in de database staat,
 * en gebruiken ze altijd precies de seeddata uit de Flyway-migraties.
 *
 * Geregistreerd via {@code META-INF/spring.factories} (src/test/resources), dus voor alle
 * {@code @SpringBootTest}-klassen; de tests zelf hoeven er niets voor te doen. Alleen in src/test:
 * de applicatie zelf start hier nooit mee.
 *
 * Eén instantie per testrun (JVM) die alle contexten delen. Tests zijn {@code @Transactional} en draaien
 * dus met rollback; een test mag niets committen, anders ziet een volgende test die data wel.
 */
public class EmbeddedPostgresInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    private static EmbeddedPostgres postgres;

    @Override
    public void initialize(ConfigurableApplicationContext context) {
        EmbeddedPostgres database = start();
        // applyTo() zet deze waarden bovenaan: ze winnen van application.yaml en van omgevingsvariabelen,
        // zodat een test nooit per ongeluk tegen een echte database draait.
        TestPropertyValues.of(
                "spring.datasource.url=" + database.getJdbcUrl("postgres", "postgres"),
                "spring.datasource.username=postgres",
                "spring.datasource.password="
        ).applyTo(context);
    }

    private static synchronized EmbeddedPostgres start() {
        if (postgres == null) {
            try {
                postgres = EmbeddedPostgres.builder().start();
            } catch (IOException e) {
                throw new IllegalStateException("Kon de tijdelijke PostgreSQL voor de tests niet starten", e);
            }
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try {
                    postgres.close();
                } catch (IOException ignored) {
                    // opruimen is best effort; de data-map ligt in de tijdelijke map van het systeem
                }
            }));
        }
        return postgres;
    }
}
