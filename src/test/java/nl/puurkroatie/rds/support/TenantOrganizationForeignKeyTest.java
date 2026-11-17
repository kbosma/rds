package nl.puurkroatie.rds.support;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Bedrijfsgegevens verwijzen met {@code tenant_organization} naar hun organisatie via een foreign key met
 * ON DELETE RESTRICT (V21). De database laat dus geen verweesde data toe, ook niet buiten de
 * OrganizationDeletionGuard om (handmatige SQL, een codepad zonder guard).
 */
@SpringBootTest
@Transactional
class TenantOrganizationForeignKeyTest {

    /**
     * Gegevens van de organisatie zelf: die gaan mee als een (lege) organisatie wordt verwijderd (ON DELETE CASCADE).
     * Alle andere tenant-tabellen zijn bedrijfsgegevens en houden het verwijderen tegen (ON DELETE RESTRICT).
     */
    private static final Set<String> OWNED_BY_THE_ORGANIZATION =
            Set.of("person", "account", "organization_theme", "organization_settings");

    @Autowired
    private JdbcTemplate jdbc;

    private String newOrganization() {
        String id = jdbc.queryForObject("SELECT gen_random_uuid()::text", String.class);
        jdbc.update("INSERT INTO organization (organization_id, name, created_at) VALUES (?::uuid, 'FK-test BV', now())", id);
        return id;
    }

    private void insertBooker(String organizationId) {
        jdbc.update("INSERT INTO booker (booker_id, firstname, lastname, status, created_at, tenant_organization) "
                + "VALUES (gen_random_uuid(), 'X', 'Y', 'ACTIVE', now(), ?::uuid)", organizationId);
    }

    /** Ook een tabel die later wordt toegevoegd moet de foreign key krijgen; anders faalt deze test. */
    @Test
    void everyTenantTable_hasAValidatedRestrictForeignKeyToOrganization() {
        List<String> tenantTables = jdbc.queryForList(
                "SELECT table_name FROM information_schema.columns "
                        + "WHERE column_name = 'tenant_organization' AND table_schema = current_schema() ORDER BY table_name",
                String.class);
        assertFalse(tenantTables.isEmpty());

        // tabel -> (on-delete-actie, gevalideerd) van de foreign key op tenant_organization naar organization
        Map<String, String> foreignKeys = jdbc.queryForList(
                        "SELECT c.conrelid::regclass::text AS table_name, c.confdeltype::text AS on_delete, c.convalidated "
                                + "FROM pg_constraint c "
                                + "JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey) "
                                + "WHERE c.contype = 'f' AND a.attname = 'tenant_organization' "
                                + "AND c.confrelid = 'organization'::regclass")
                .stream()
                .collect(Collectors.toMap(row -> (String) row.get("table_name"),
                        row -> row.get("on_delete") + "/" + row.get("convalidated")));

        for (String table : tenantTables) {
            // 'r' = ON DELETE RESTRICT, 'c' = CASCADE; true = bestaande rijen zijn gevalideerd (geen NOT VALID)
            String expected = OWNED_BY_THE_ORGANIZATION.contains(table) ? "c/true" : "r/true";
            assertEquals(expected, foreignKeys.get(table),
                    table + ".tenant_organization mist een gevalideerde foreign key (" + expected + ") naar organization");
        }
    }

    @Test
    void anOrganizationWithBusinessData_cannotBeDeletedBySqlEither() {
        String org = newOrganization();
        insertBooker(org);

        DataIntegrityViolationException ex = assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("DELETE FROM organization WHERE organization_id = ?::uuid", org));
        assertTrue(ex.getMessage().contains("fk_booker_tenant_organization"), ex.getMessage());
    }

    @Test
    void businessDataForANonExistingOrganization_isRefused() {
        DataIntegrityViolationException ex = assertThrows(DataIntegrityViolationException.class,
                () -> insertBooker("00000000-0000-0000-0000-0000000000ff"));
        assertTrue(ex.getMessage().contains("fk_booker_tenant_organization"), ex.getMessage());
    }

    @Test
    void anOrganizationWithOnlyAPerson_canStillBeDeleted_andTakesThePersonAlong() {
        String org = newOrganization();
        jdbc.update("INSERT INTO person (person_id, firstname, lastname, tenant_organization, created_at) "
                + "VALUES (gen_random_uuid(), 'Jan', 'Mens', ?::uuid, now())", org);

        assertEquals(1, jdbc.update("DELETE FROM organization WHERE organization_id = ?::uuid", org));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM person WHERE tenant_organization = ?::uuid", Integer.class, org));
    }

    @Test
    void anAccountAlwaysBelongsToTheOrganizationOfItsPerson() {
        String own = newOrganization();
        String other = newOrganization();
        String person = jdbc.queryForObject("INSERT INTO person (person_id, firstname, lastname, tenant_organization, created_at) "
                + "VALUES (gen_random_uuid(), 'Jan', 'Mens', ?::uuid, now()) RETURNING person_id::text", String.class, own);

        DataIntegrityViolationException ex = assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("INSERT INTO account (account_id, user_name, password_hash, person_id, locked, must_change_password, "
                        + "totp_enabled, totp_verified, created_at, tenant_organization) "
                        + "VALUES (gen_random_uuid(), 'fk.test', 'x', ?::uuid, false, false, false, false, now(), ?::uuid)", person, other));
        assertTrue(ex.getMessage().contains("fk_account_person_tenant_organization"), ex.getMessage());
    }

    @Test
    void whenAPersonMovesToAnotherOrganization_hisAccountsMoveAlong() {
        String own = newOrganization();
        String other = newOrganization();
        String person = jdbc.queryForObject("INSERT INTO person (person_id, firstname, lastname, tenant_organization, created_at) "
                + "VALUES (gen_random_uuid(), 'Jan', 'Mens', ?::uuid, now()) RETURNING person_id::text", String.class, own);
        jdbc.update("INSERT INTO account (account_id, user_name, password_hash, person_id, locked, must_change_password, "
                + "totp_enabled, totp_verified, created_at, tenant_organization) "
                + "VALUES (gen_random_uuid(), 'fk.test', 'x', ?::uuid, false, false, false, false, now(), ?::uuid)", person, own);

        jdbc.update("UPDATE person SET tenant_organization = ?::uuid WHERE person_id = ?::uuid", other, person);

        assertEquals(other, jdbc.queryForObject("SELECT tenant_organization::text FROM account WHERE person_id = ?::uuid",
                String.class, person));
    }
}
