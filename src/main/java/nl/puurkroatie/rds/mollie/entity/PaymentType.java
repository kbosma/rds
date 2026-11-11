package nl.puurkroatie.rds.mollie.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import nl.puurkroatie.rds.common.EnumValues;

/**
 * Soort betaling. VOORSCHOT, RESTANT en DEFINITIEF maakt het systeem bij het bevestigen van de offerte
 * (DEFINITIEF = in één keer, als ook de restanttermijn al voorbij is); OVERIG legt een medewerker zelf vast.
 */
public enum PaymentType {

    VOORSCHOT, RESTANT, DEFINITIEF, OVERIG;

    @JsonValue
    public String toValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static PaymentType fromValue(String value) {
        return EnumValues.parse(PaymentType.class, value);
    }
}
