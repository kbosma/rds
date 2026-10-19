package nl.puurkroatie.rds.support;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Een betaling en haar statushistorie worden nooit verwijderd (V11), ook niet als er geen Mollie-id is en ook niet via
 * een cascade. Dit is op databaseniveau afgedwongen, naast het ontbreken van een verwijder-endpoint in de API.
 */
@SpringBootTest
@Transactional
class PaymentNeverDeletedTest {

    private static final String PAYMENT_WITH_MOLLIE_ID = "08000000-0000-0000-0000-000000000004";
    private static final String STATUS_ENTRY = "09000000-0000-0000-0000-000000000004";
    private static final String ORG_TECHPARTNER = "a1000000-0000-0000-0000-000000000002";

    @Autowired
    private JdbcTemplate jdbc;

    /** Een nieuwe betaling zonder Mollie-id (een aankondiging), optioneel met een eerste statusregel. */
    private String newAnnouncement(boolean withStatusEntry) {
        String id = jdbc.queryForObject("SELECT gen_random_uuid()::text", String.class);
        jdbc.update("INSERT INTO mollie_payment (mollie_payment_id, amount, currency, description, created_at, tenant_organization) "
                + "VALUES (?::uuid, 10, 'EUR', 'Aankondiging', now(), ?::uuid)", id, ORG_TECHPARTNER);
        if (withStatusEntry) {
            jdbc.update("INSERT INTO mollie_payment_status_entry (mollie_payment_status_entry_id, mollie_payment_id, status, created_at) "
                    + "VALUES (gen_random_uuid(), ?::uuid, 'OPEN', now())", id);
        }
        return id;
    }

    private static void assertDeleteIsRefused(Runnable delete) {
        DataIntegrityViolationException ex = assertThrows(DataIntegrityViolationException.class, delete::run);
        assertTrue(ex.getMessage().contains("blijven altijd bewaard"), ex.getMessage());
    }

    @Test
    void aStatusEntryCannotBeDeleted() {
        assertDeleteIsRefused(() -> jdbc.update(
                "DELETE FROM mollie_payment_status_entry WHERE mollie_payment_status_entry_id = ?::uuid", STATUS_ENTRY));
    }

    @Test
    void aPaymentWithAMollieIdCannotBeDeleted() {
        assertDeleteIsRefused(() -> jdbc.update("DELETE FROM mollie_payment WHERE mollie_payment_id = ?::uuid", PAYMENT_WITH_MOLLIE_ID));
    }

    @Test
    void anAnnouncementWithoutMollieIdAndWithHistoryCannotBeDeleted() {
        String id = newAnnouncement(true);
        assertDeleteIsRefused(() -> jdbc.update("DELETE FROM mollie_payment WHERE mollie_payment_id = ?::uuid", id));
    }

    @Test
    void anAnnouncementWithoutMollieIdAndWithoutHistoryCannotBeDeletedEither() {
        String id = newAnnouncement(false);
        assertDeleteIsRefused(() -> jdbc.update("DELETE FROM mollie_payment WHERE mollie_payment_id = ?::uuid", id));
    }

    @Test
    void theTablesCannotBeTruncated() {
        assertDeleteIsRefused(() -> jdbc.execute("TRUNCATE mollie_payment_status_entry"));
    }

    @Test
    void nothingWasLostByTheFailedAttempts() {
        Integer entries = jdbc.queryForObject("SELECT count(*) FROM mollie_payment_status_entry WHERE mollie_payment_status_entry_id = ?::uuid",
                Integer.class, STATUS_ENTRY);
        assertEquals(1, entries);
    }
}
