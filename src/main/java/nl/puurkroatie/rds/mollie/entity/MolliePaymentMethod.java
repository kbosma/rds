package nl.puurkroatie.rds.mollie.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum MolliePaymentMethod {

    IDEAL, CREDITCARD, BANCONTACT, SOFORT, BANKTRANSFER,
    PAYPAL, BELFIUS, KBC, EPS, GIROPAY, PRZELEWY24,
    APPLEPAY, GOOGLEPAY, IN3, KLARNA, RIVERTY;

    @JsonValue
    public String toValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static MolliePaymentMethod fromValue(String value) {
        return valueOf(value.toUpperCase());
    }
}
