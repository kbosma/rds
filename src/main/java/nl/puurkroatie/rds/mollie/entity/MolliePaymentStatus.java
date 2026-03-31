package nl.puurkroatie.rds.mollie.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum MolliePaymentStatus {

    OPEN, PENDING, AUTHORIZED, PAID, FAILED, CANCELED, EXPIRED;

    @JsonValue
    public String toValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static MolliePaymentStatus fromValue(String value) {
        return valueOf(value.toUpperCase());
    }
}
