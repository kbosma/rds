package nl.puurkroatie.rds.booking.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AddressRole {

    WOON, FACTUUR, ACCOMMODATIE, LEVERANCIER;

    @JsonValue
    public String toValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static AddressRole fromValue(String value) {
        return valueOf(value.toUpperCase());
    }
}
