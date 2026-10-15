package nl.puurkroatie.rds.booking.entity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class BookerStatusTest {

    @Test
    void toValue_returnsLowercase() {
        assertEquals("prospect", BookerStatus.PROSPECT.toValue());
        assertEquals("active", BookerStatus.ACTIVE.toValue());
    }

    @Test
    void fromValue_isCaseInsensitive() {
        assertEquals(BookerStatus.PROSPECT, BookerStatus.fromValue("prospect"));
        assertEquals(BookerStatus.PROSPECT, BookerStatus.fromValue("PROSPECT"));
        assertEquals(BookerStatus.ACTIVE, BookerStatus.fromValue("Active"));
    }

    @Test
    void fromValue_roundTripsForEveryValue() {
        for (BookerStatus status : BookerStatus.values()) {
            assertEquals(status, BookerStatus.fromValue(status.toValue()));
        }
    }

    @Test
    void fromValue_unknown_throws() {
        assertThrows(IllegalArgumentException.class, () -> BookerStatus.fromValue("bogus"));
    }
}
