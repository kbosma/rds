package nl.puurkroatie.rds.booking.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ActivityType {

    TOUR, EXCURSIE, TICKET, TRANSFER;

    @JsonValue
    public String toValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static ActivityType fromValue(String value) {
        return valueOf(value.toUpperCase());
    }
}
