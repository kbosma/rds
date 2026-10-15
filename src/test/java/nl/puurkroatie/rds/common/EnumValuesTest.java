package nl.puurkroatie.rds.common;

import nl.puurkroatie.rds.booking.entity.Gender;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentMethod;
import org.junit.jupiter.api.Test;

import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * EnumValues.parse vertaalt API-tekst naar een enum-constante en geeft bij een
 * onbekende waarde een melding die de toegestane waarden noemt (i.p.v. de kale
 * "No enum constant nl.puurkroatie...Gender.F" van Enum.valueOf).
 */
class EnumValuesTest {

    enum Sample { IDEAL, OTHER }

    @Test
    void parse_isCaseInsensitive() {
        assertEquals(Sample.OTHER, EnumValues.parse(Sample.class, "other"));
        assertEquals(Sample.OTHER, EnumValues.parse(Sample.class, "OTHER"));
        assertEquals(Sample.OTHER, EnumValues.parse(Sample.class, "Other"));
    }

    @Test
    void parse_doesNotDependOnTheDefaultLocale() {
        // In een Turkse locale wordt "ideal".toUpperCase() -> "İDEAL" (gestippelde İ),
        // wat met Enum.valueOf(value.toUpperCase()) niet meer matcht.
        Locale original = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            assertEquals(Sample.IDEAL, EnumValues.parse(Sample.class, "ideal"));
        } finally {
            Locale.setDefault(original);
        }
    }

    @Test
    void parse_unknownValue_throwsWithValueTypeAndAllowedValues() {
        InvalidEnumValueException ex = assertThrows(InvalidEnumValueException.class,
                () -> EnumValues.parse(Sample.class, "bogus"));

        assertEquals("Invalid value 'bogus' for Sample. Allowed values: ideal, other", ex.getMessage());
    }

    @Test
    void parse_null_throwsWithAllowedValues() {
        InvalidEnumValueException ex = assertThrows(InvalidEnumValueException.class,
                () -> EnumValues.parse(Sample.class, null));

        assertEquals("Invalid value null for Sample. Allowed values: ideal, other", ex.getMessage());
    }

    @Test
    void exception_isAnIllegalArgumentException_soExistingCallersKeepWorking() {
        assertThrows(IllegalArgumentException.class, () -> EnumValues.parse(Sample.class, "bogus"));
    }

    // De fout uit de praktijk: de traveler-dialog stuurde gender "F".
    @Test
    void gender_F_givesAReadableMessageWithoutJavaInternals() {
        InvalidEnumValueException ex = assertThrows(InvalidEnumValueException.class, () -> Gender.fromValue("F"));

        assertEquals("Invalid value 'F' for Gender. Allowed values: man, vrouw, anders", ex.getMessage());
        assertFalse(ex.getMessage().contains("No enum constant"), "geen kale Enum.valueOf-melding");
        assertFalse(ex.getMessage().contains("nl.puurkroatie"), "geen package-namen in een API-fout");
    }

    @Test
    void allowedValues_matchTheWireFormatOfToValue() {
        // De lijst "Allowed values" moet exact de waarden zijn die de API zelf teruggeeft.
        InvalidEnumValueException ex = assertThrows(InvalidEnumValueException.class,
                () -> MolliePaymentMethod.fromValue("bogus"));

        for (MolliePaymentMethod method : MolliePaymentMethod.values()) {
            assertTrue(ex.getMessage().contains(method.toValue()),
                    "toegestane waarden moeten '" + method.toValue() + "' bevatten: " + ex.getMessage());
        }
    }
}
