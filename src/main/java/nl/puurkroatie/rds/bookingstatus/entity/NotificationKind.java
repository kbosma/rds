package nl.puurkroatie.rds.bookingstatus.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import nl.puurkroatie.rds.common.EnumValues;

/** Waarom er een notificatie is. */
public enum NotificationKind {

    /** Alles is betaald: de reisgegevens kunnen verstuurd worden. */
    ALLES_BETAALD,
    /** De reis is begonnen. */
    OP_REIS,
    /** De reis is voorbij. */
    WEER_THUIS,
    /** Een betaling is teruggeboekt; de status is teruggezet. */
    TERUGBOEKING;

    @JsonValue
    public String toValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static NotificationKind fromValue(String value) {
        return EnumValues.parse(NotificationKind.class, value);
    }
}
