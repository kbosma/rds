package nl.puurkroatie.rds.docgen.context;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BookerContextTest {

    private static BookerContext booker(String firstname, String prefix, String lastname) {
        return new BookerContext(firstname, prefix, lastname, null, null, null, null, null, null, List.of());
    }

    @Test
    void fullName_joinsFirstnamePrefixAndLastname() {
        assertEquals("Jan de Vries", booker("Jan", "de", "Vries").getFullName());
    }

    @Test
    void fullName_skipsMissingOrBlankParts() {
        assertEquals("Jan Vries", booker("Jan", null, "Vries").getFullName());
        assertEquals("Jan Vries", booker("Jan", "  ", "Vries").getFullName());
        assertEquals("Vries", booker(null, null, "Vries").getFullName());
        assertEquals("", booker(null, null, null).getFullName());
    }
}
