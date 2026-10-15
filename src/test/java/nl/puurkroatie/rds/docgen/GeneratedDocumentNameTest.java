package nl.puurkroatie.rds.docgen;

import nl.puurkroatie.rds.docgen.service.GeneratedDocumentName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GeneratedDocumentNameTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 14, 15, 32, 7);

    @Test
    void containsTemplateBookingNumberDateAndTime() {
        assertEquals("Offerte - B-2026-0042 - 2026-10-14 15-32-07.docx",
                GeneratedDocumentName.of("Offerte", "B-2026-0042", NOW, ".docx"));
    }

    @Test
    void keepsThePdfExtension() {
        assertTrue(GeneratedDocumentName.of("Offerte", "B-1", NOW, ".pdf").endsWith(".pdf"));
    }

    @Test
    void hasNoCharactersThatAreInvalidInFilenames() {
        String name = GeneratedDocumentName.of("Offerte", "B-1", NOW, ".docx");

        assertFalse(name.contains(":"), name);
    }

    @Test
    void twoDocumentsFromTheSameTemplateAndBookingGetDifferentNames() {
        String first = GeneratedDocumentName.of("Offerte", "B-1", NOW, ".docx");
        String second = GeneratedDocumentName.of("Offerte", "B-1", NOW.plusSeconds(1), ".docx");

        assertNotEquals(first, second);
    }

    @Test
    void aVeryLongTemplateNameIsShortenedSoTheNameFitsTheColumn() {
        String name = GeneratedDocumentName.of("x".repeat(255), "B-2026-0042", NOW, ".docx");

        assertEquals(255, name.length());
        // het deel na de templatenaam blijft heel: boekingsnummer, datum/tijd en extensie
        assertTrue(name.endsWith(" - B-2026-0042 - 2026-10-14 15-32-07.docx"), name);
    }

    @Test
    void aShortTemplateNameIsNotPadded() {
        assertTrue(GeneratedDocumentName.of("Kort", "B-1", NOW, ".docx").startsWith("Kort - B-1"));
    }
}
