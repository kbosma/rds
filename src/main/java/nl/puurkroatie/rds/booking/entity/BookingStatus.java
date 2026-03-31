package nl.puurkroatie.rds.booking.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum BookingStatus {

    AANVRAAG, OFFERTE, BOEKING, VOORSCHOT, BETAALD, AFGEROND;

    @JsonValue
    public String toValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static BookingStatus fromValue(String value) {
        return valueOf(value.toUpperCase());
    }
}
