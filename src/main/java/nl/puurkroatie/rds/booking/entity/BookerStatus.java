package nl.puurkroatie.rds.booking.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import nl.puurkroatie.rds.common.EnumValues;

public enum BookerStatus {

    PROSPECT, ACTIVE;

    @JsonValue
    public String toValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static BookerStatus fromValue(String value) {
        return EnumValues.parse(BookerStatus.class, value);
    }
}
