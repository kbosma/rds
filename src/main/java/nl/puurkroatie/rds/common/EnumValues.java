package nl.puurkroatie.rds.common;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Gedeelde vertaling van API-tekstwaarden naar enum-constanten, voor de enums die
 * als lowercase-tekst over de API gaan (zie o.a. Gender, BookingStatus).
 */
public final class EnumValues {

    private EnumValues() {
    }

    /**
     * Zoekt de constante die bij {@code value} hoort (hoofdletterongevoelig).
     *
     * @throws InvalidEnumValueException als de waarde leeg of onbekend is; de boodschap
     *                                   bevat de toegestane waarden
     */
    public static <E extends Enum<E>> E parse(Class<E> type, String value) {
        E[] constants = type.getEnumConstants();
        if (value != null) {
            // equalsIgnoreCase is taalonafhankelijk (toUpperCase() gebruikt de default-locale).
            for (E constant : constants) {
                if (constant.name().equalsIgnoreCase(value)) {
                    return constant;
                }
            }
        }
        throw new InvalidEnumValueException(
                "Invalid value " + (value == null ? "null" : "'" + value + "'") + " for " + type.getSimpleName()
                        + ". Allowed values: " + allowedValues(constants));
    }

    private static <E extends Enum<E>> String allowedValues(E[] constants) {
        return Arrays.stream(constants)
                .map(c -> c.name().toLowerCase())
                .collect(Collectors.joining(", "));
    }
}
