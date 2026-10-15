package nl.puurkroatie.rds.booking.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import nl.puurkroatie.rds.common.EnumValues;

public enum Gender {

    MAN, VROUW, ANDERS;

    @JsonValue
    public String toValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static Gender fromValue(String value) {
        return EnumValues.parse(Gender.class, value);
    }
}
