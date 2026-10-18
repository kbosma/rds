package nl.puurkroatie.rds.support;

import nl.puurkroatie.rds.booking.entity.BookerStatus;
import nl.puurkroatie.rds.booking.entity.BookingStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Bewaakt de CHECK-constraints op BOOKING.booking_status en BOOKER.status (migratie V9): de database
 * weigert onbekende waarden, en de constraint bevat precies de waarden van de Java-enums. Voeg je een
 * status toe aan een enum zonder migratie, dan faalt deze test.
 */
@SpringBootTest
@Transactional
class StatusConstraintsTest {

    private static final String SEED_BOOKING = "01000000-0000-0000-0000-000000000004";
    private static final String SEED_BOOKER = "02000000-0000-0000-0000-000000000004";

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void bookingStatusConstraintMatchesTheEnum() {
        assertEquals(enumNames(BookingStatus.values()), allowedValues("booking_status_check"));
    }

    @Test
    void bookerStatusConstraintMatchesTheEnum() {
        assertEquals(enumNames(BookerStatus.values()), allowedValues("booker_status_check"));
    }

    @Test
    void bookingAcceptsEveryBookingStatus() {
        for (BookingStatus status : BookingStatus.values()) {
            int updated = jdbc.update("UPDATE booking SET booking_status = ? WHERE booking_id = ?::uuid",
                    status.name(), SEED_BOOKING);
            assertEquals(1, updated, "Status " + status + " moet in de database te zetten zijn");
        }
    }

    @Test
    void bookerAcceptsEveryBookerStatus() {
        for (BookerStatus status : BookerStatus.values()) {
            int updated = jdbc.update("UPDATE booker SET status = ? WHERE booker_id = ?::uuid",
                    status.name(), SEED_BOOKER);
            assertEquals(1, updated, "Status " + status + " moet in de database te zetten zijn");
        }
    }

    @Test
    void bookingRejectsUnknownStatus() {
        DataIntegrityViolationException ex = assertThrows(DataIntegrityViolationException.class, () ->
                jdbc.update("UPDATE booking SET booking_status = 'BESTAAT_NIET' WHERE booking_id = ?::uuid", SEED_BOOKING));
        assertTrue(ex.getMessage().contains("booking_status_check"), ex.getMessage());
    }

    @Test
    void bookingRejectsLowercaseStatus() {
        // De API gebruikt kleine letters, maar in de database staat de enum-naam in hoofdletters.
        assertThrows(DataIntegrityViolationException.class, () ->
                jdbc.update("UPDATE booking SET booking_status = 'aanvraag' WHERE booking_id = ?::uuid", SEED_BOOKING));
    }

    @Test
    void bookerRejectsUnknownStatus() {
        DataIntegrityViolationException ex = assertThrows(DataIntegrityViolationException.class, () ->
                jdbc.update("UPDATE booker SET status = 'BESTAAT_NIET' WHERE booker_id = ?::uuid", SEED_BOOKER));
        assertTrue(ex.getMessage().contains("booker_status_check"), ex.getMessage());
    }

    private static Set<String> enumNames(Enum<?>[] values) {
        return Arrays.stream(values).map(Enum::name).collect(Collectors.toSet());
    }

    /** De waarden tussen aanhalingstekens in de definitie van de constraint, bv. CHECK (x IN ('A', 'B')). */
    private Set<String> allowedValues(String constraintName) {
        String definition = jdbc.queryForObject(
                "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = ?", String.class, constraintName);
        Set<String> values = new HashSet<>();
        Matcher matcher = Pattern.compile("'([A-Z_]+)'").matcher(definition);
        while (matcher.find()) {
            values.add(matcher.group(1));
        }
        return values;
    }
}
