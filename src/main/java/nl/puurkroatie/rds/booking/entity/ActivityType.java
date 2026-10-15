package nl.puurkroatie.rds.booking.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import nl.puurkroatie.rds.common.EnumValues;

public enum ActivityType {

    TOUR, EXCURSIE, TICKET, TRANSFER;

    @JsonValue
    public String toValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static ActivityType fromValue(String value) {
        return EnumValues.parse(ActivityType.class, value);
    }
}
