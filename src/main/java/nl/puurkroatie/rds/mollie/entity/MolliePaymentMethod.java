package nl.puurkroatie.rds.mollie.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import nl.puurkroatie.rds.common.EnumValues;

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
        return EnumValues.parse(MolliePaymentMethod.class, value);
    }
}
