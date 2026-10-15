package nl.puurkroatie.rds.docgen;

import nl.puurkroatie.rds.docgen.context.AddressContext;
import nl.puurkroatie.rds.docgen.context.BookerContext;
import nl.puurkroatie.rds.docgen.context.BookingActivityContext;
import nl.puurkroatie.rds.docgen.context.BookingContext;
import nl.puurkroatie.rds.docgen.service.TemplateModels;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * TemplateModels zet de context-beans om naar een platte structuur voor de (niet-vertrouwde)
 * .docx-template: geen Java-beans meer, dus geen reflectie via bv. {@code booking.class}.
 */
class TemplateModelsTest {

    private final AddressContext address =
            new AddressContext("Keizersgracht", 123, "A", "1015CJ", "Amsterdam", "Nederland", "HOME");

    private final BookerContext booker = new BookerContext("Jan", "van", "Bergen", "Jansen", "+31612345678",
            "jan@example.com", "MALE", LocalDate.of(1985, 3, 15), "J.", List.of(address));

    private final BigDecimal total = new BigDecimal("1250.00");

    private final BookingContext booking = new BookingContext("B-1", "aanvraag", LocalDate.of(2026, 6, 1),
            LocalDate.of(2026, 6, 8), total, booker, List.of(), List.of(),
            List.of(new BookingActivityContext("Kajak", "SPORT", LocalDateTime.of(2026, 6, 2, 10, 30),
                    LocalDateTime.of(2026, 6, 2, 12, 0), "Haven", new BigDecimal("40.00"))));

    @SuppressWarnings("unchecked")
    private Map<String, Object> map(Object o) {
        return (Map<String, Object>) o;
    }

    @Test
    void beanProperties_becomeMapKeysWithTheSameName() {
        Map<String, Object> model = TemplateModels.toModel(booking);

        assertEquals("B-1", model.get("bookingNumber"));
        assertEquals("aanvraag", model.get("bookingStatus"));
        assertEquals("Jan", map(model.get("booker")).get("firstname"));
        assertEquals("Keizersgracht",
                map(((List<?>) map(model.get("booker")).get("addresses")).get(0)).get("street"));
    }

    @Test
    void noClassKey_atAnyLevel() {
        Map<String, Object> model = TemplateModels.toModel(booking);

        assertFalse(model.containsKey("class"));
        assertFalse(map(model.get("booker")).containsKey("class"));
        assertFalse(map(((List<?>) model.get("bookingActivities")).get(0)).containsKey("class"));
    }

    @Test
    void numbersStayNumbers_soFreemarkerKeepsFormattingThemItself() {
        Map<String, Object> model = TemplateModels.toModel(booking);

        assertSame(total, model.get("totalSum"));
        Object housenumber = map(((List<?>) map(model.get("booker")).get("addresses")).get(0)).get("housenumber");
        assertEquals(123, housenumber);
    }

    @Test
    void datesAndTimes_becomTheirIsoText_exactlyWhatInterpolationShowedBefore() {
        Map<String, Object> model = TemplateModels.toModel(booking);

        assertEquals("2026-06-01", model.get("fromDate"));
        assertEquals("1985-03-15", map(model.get("booker")).get("birthdate"));
        assertEquals("2026-06-02T10:30", map(((List<?>) model.get("bookingActivities")).get(0)).get("fromDate"));
    }

    @Test
    void nullStaysNull_butTheKeyIsPresent_soDefaultsLikeNameBangQuotesWork() {
        Map<String, Object> model = TemplateModels.toModel(new BookingContext(
                "B-1", "aanvraag", null, null, null, null, List.of(), List.of(), List.of()));

        assertTrue(model.containsKey("booker"));
        assertNull(model.get("booker"));
        assertNull(model.get("fromDate"));
    }

    @Test
    void listsStayLists() {
        Map<String, Object> model = TemplateModels.toModel(booking);

        assertTrue(model.get("bookingActivities") instanceof List);
        assertEquals(1, ((List<?>) model.get("bookingActivities")).size());
    }

    @Test
    void theWholeModel_containsNoJavaBeans() {
        assertOnlyPlainValues(TemplateModels.toModel(booking), "booking");
    }

    private void assertOnlyPlainValues(Object value, String path) {
        if (value == null || value instanceof String || value instanceof Number || value instanceof Boolean) {
            return;
        }
        if (value instanceof Map<?, ?> m) {
            m.forEach((k, v) -> assertOnlyPlainValues(v, path + "." + k));
            return;
        }
        if (value instanceof Collection<?> c) {
            int i = 0;
            for (Object element : c) {
                assertOnlyPlainValues(element, path + "[" + i++ + "]");
            }
            return;
        }
        throw new AssertionError("Java-object in het template-model op " + path + ": " + value.getClass().getName());
    }

    @Test
    void unknownType_isRefusedInsteadOfBeingExposedAsABean() {
        assertThrows(IllegalArgumentException.class, () -> TemplateModels.toModel(new StringBuilder("x")));
        assertThrows(IllegalArgumentException.class, () -> TemplateModels.toModel(null));
    }
}
