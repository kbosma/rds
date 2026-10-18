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
 * De statushistorie van een betaling is alleen-toevoegen, ook op databaseniveau: een bestaande regel wijzigen
 * kan niet (trigger), een correctie vereist een reden en alleen bekende statussen zijn toegestaan (V10).
 */
@SpringBootTest
@Transactional
class PaymentStatusEntryAppendOnlyTest {

    private static final String SEED_ENTRY = "09000000-0000-0000-0000-000000000004";
    private static final String PAYMENT = "08000000-0000-0000-0000-000000000004";

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void existingEntryCannotBeUpdated() {
        DataIntegrityViolationException ex = assertThrows(DataIntegrityViolationException.class, () ->
                jdbc.update("UPDATE mollie_payment_status_entry SET status = 'PAID' WHERE mollie_payment_status_entry_id = ?::uuid", SEED_ENTRY));
        assertTrue(ex.getMessage().contains("alleen-toevoegen"), ex.getMessage());
    }

    @Test
    void newEntriesCanBeAdded() {
        int inserted = jdbc.update("INSERT INTO mollie_payment_status_entry (mollie_payment_status_entry_id, mollie_payment_id, status, created_at) "
                + "VALUES (gen_random_uuid(), ?::uuid, 'PENDING', now())", PAYMENT);
        assertEquals(1, inserted);
    }

    @Test
    void correctionWithoutReasonIsRejected() {
        DataIntegrityViolationException ex = assertThrows(DataIntegrityViolationException.class, () ->
                jdbc.update("INSERT INTO mollie_payment_status_entry (mollie_payment_status_entry_id, mollie_payment_id, status, correction, reason, created_at) "
                        + "VALUES (gen_random_uuid(), ?::uuid, 'PAID', true, '  x ', now())", PAYMENT));
        assertTrue(ex.getMessage().contains("payment_status_entry_correction_reason_check"), ex.getMessage());
    }

    @Test
    void correctionWithReasonIsAccepted() {
        int inserted = jdbc.update("INSERT INTO mollie_payment_status_entry (mollie_payment_status_entry_id, mollie_payment_id, status, correction, reason, created_at) "
                + "VALUES (gen_random_uuid(), ?::uuid, 'PAID', true, 'Betaald per bank', now())", PAYMENT);
        assertEquals(1, inserted);
    }

    @Test
    void unknownStatusIsRejected() {
        assertThrows(DataIntegrityViolationException.class, () ->
                jdbc.update("INSERT INTO mollie_payment_status_entry (mollie_payment_status_entry_id, mollie_payment_id, status, created_at) "
                        + "VALUES (gen_random_uuid(), ?::uuid, 'KAPOT', now())", PAYMENT));
    }
}
