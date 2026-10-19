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
 * De koppeling van een betaling aan een boeking wordt nooit losgemaakt en verhuist alleen met een geregistreerde
 * herkoppeling (met reden); de herkoppelingen zelf zijn alleen-toevoegen (V12). Afgedwongen in de database.
 */
@SpringBootTest
@Transactional
class PaymentLinkIntegrityTest {

    private static final String PAYMENT = "08000000-0000-0000-0000-000000000004";
    private static final String BOOKING_FROM = "01000000-0000-0000-0000-000000000004";
    private static final String BOOKING_TO = "01000000-0000-0000-0000-000000000005";
    private static final String ORG = "a1000000-0000-0000-0000-000000000002";

    @Autowired
    private JdbcTemplate jdbc;

    private void registerRelink(String reason) {
        jdbc.update("INSERT INTO booking_mollie_payment_relink (relink_id, mollie_payment_id, from_booking_id, to_booking_id, reason, created_at, tenant_organization) "
                + "VALUES (gen_random_uuid(), ?::uuid, ?::uuid, ?::uuid, ?, now(), ?::uuid)", PAYMENT, BOOKING_FROM, BOOKING_TO, reason, ORG);
    }

    private int move() {
        return jdbc.update("UPDATE booking_mollie_payment SET booking_id = ?::uuid WHERE mollie_payment_id = ?::uuid", BOOKING_TO, PAYMENT);
    }

    private static DataIntegrityViolationException refused(Runnable action) {
        return assertThrows(DataIntegrityViolationException.class, action::run);
    }

    @Test
    void aLinkCannotBeDeleted() {
        DataIntegrityViolationException ex = refused(() -> jdbc.update("DELETE FROM booking_mollie_payment WHERE mollie_payment_id = ?::uuid", PAYMENT));
        assertTrue(ex.getMessage().contains("herkoppeling"), ex.getMessage());
    }

    @Test
    void theLinksCannotBeTruncated() {
        refused(() -> jdbc.execute("TRUNCATE booking_mollie_payment"));
    }

    @Test
    void aLinkCannotMoveWithoutARegisteredRelink() {
        DataIntegrityViolationException ex = refused(this::move);
        assertTrue(ex.getMessage().contains("geregistreerde herkoppeling"), ex.getMessage());
    }

    @Test
    void aLinkMovesOnceTheRelinkIsRegistered() {
        registerRelink("Naar de juiste boeking verplaatst");
        assertEquals(1, move());
    }

    @Test
    void theRelinkMustMatchTheMove() {
        // een herkoppeling naar een andere boeking dan waar de koppeling naartoe gaat, geeft geen vrijbrief
        jdbc.update("INSERT INTO booking_mollie_payment_relink (relink_id, mollie_payment_id, from_booking_id, to_booking_id, reason, created_at, tenant_organization) "
                + "VALUES (gen_random_uuid(), ?::uuid, ?::uuid, '01000000-0000-0000-0000-000000000006', 'Naar boeking zes', now(), ?::uuid)", PAYMENT, BOOKING_FROM, ORG);
        refused(this::move); // verhuist naar BOOKING_TO (vijf), geregistreerd is zes
    }

    @Test
    void thePaymentOfALinkCannotBeChanged() {
        refused(() -> jdbc.update("UPDATE booking_mollie_payment SET mollie_payment_id = '08000000-0000-0000-0000-000000000005' WHERE mollie_payment_id = ?::uuid", PAYMENT));
    }

    @Test
    void aRelinkNeedsAReason() {
        refused(() -> registerRelink("  x "));
    }

    @Test
    void aRelinkMustGoToAnotherBooking() {
        refused(() -> jdbc.update("INSERT INTO booking_mollie_payment_relink (relink_id, mollie_payment_id, from_booking_id, to_booking_id, reason, created_at, tenant_organization) "
                + "VALUES (gen_random_uuid(), ?::uuid, ?::uuid, ?::uuid, 'Zelfde boeking', now(), ?::uuid)", PAYMENT, BOOKING_FROM, BOOKING_FROM, ORG));
    }

    @Test
    void aRegisteredRelinkCannotBeChanged() {
        registerRelink("Naar de juiste boeking verplaatst");
        refused(() -> jdbc.update("UPDATE booking_mollie_payment_relink SET reason = 'Aangepast achteraf' WHERE mollie_payment_id = ?::uuid", PAYMENT));
    }

    @Test
    void aRegisteredRelinkCannotBeDeleted() {
        registerRelink("Naar de juiste boeking verplaatst");
        refused(() -> jdbc.update("DELETE FROM booking_mollie_payment_relink WHERE mollie_payment_id = ?::uuid", PAYMENT));
    }
}
