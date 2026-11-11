package nl.puurkroatie.rds.mollie.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import nl.puurkroatie.rds.common.EnumValues;

public enum MolliePaymentStatus {

    OPEN, PENDING, AUTHORIZED, PAID, FAILED, CANCELED, EXPIRED,
    /** Betaald, maar daarna teruggeboekt (Mollie-chargeback of een correctie): telt niet meer als betaald. */
    CHARGED_BACK;

    @JsonValue
    public String toValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static MolliePaymentStatus fromValue(String value) {
        return EnumValues.parse(MolliePaymentStatus.class, value);
    }
}
