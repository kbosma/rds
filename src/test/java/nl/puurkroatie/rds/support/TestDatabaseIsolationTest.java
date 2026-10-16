package nl.puurkroatie.rds.support;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Bewaakt de testopzet: de tests draaien tegen de tijdelijke embedded PostgreSQL met schone Flyway-seeddata,
 * en nooit tegen de lokale ontwikkeldatabase of een omgevingsdatabase.
 */
@SpringBootTest
class TestDatabaseIsolationTest {

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void testsUseTheEmbeddedDatabaseNotTheLocalOne() {
        assertFalse(datasourceUrl.contains("rdsdb"), "Tests mogen niet tegen rdsdb draaien: " + datasourceUrl);
        assertFalse(datasourceUrl.contains(":5432"), "Tests mogen niet op de standaardpoort draaien: " + datasourceUrl);
    }

    @Test
    void databaseContainsOnlyTheFlywaySeedData() {
        Integer migrations = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM flyway_schema_history WHERE success", Integer.class);
        assertTrue(migrations != null && migrations >= 8, "Alle Flyway-migraties (V1..V8) moeten gedraaid zijn");

        // Vaste seed: precies deze twee medewerkers-organisaties horen bij de testaannames (zie AbstractControllerTest).
        Integer seededOrganizations = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM organization WHERE organization_id IN "
                        + "('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002')",
                Integer.class);
        assertEquals(2, seededOrganizations);
    }
}
