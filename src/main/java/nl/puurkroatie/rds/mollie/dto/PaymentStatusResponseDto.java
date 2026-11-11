package nl.puurkroatie.rds.mollie.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class PaymentStatusResponseDto {

    private String id;
    private String status;
    private Amount amount;
    private String paidAt;
    private Map<String, String> metadata;
    /** Door Mollie teruggeboekt bedrag (chargeback); alleen aanwezig als er een terugboeking is. */
    private Amount amountChargedBack;

    public PaymentStatusResponseDto() {
    }

    public PaymentStatusResponseDto(String id, String status, Amount amount, String paidAt, Map<String, String> metadata) {
        this.id = id;
        this.status = status;
        this.amount = amount;
        this.paidAt = paidAt;
        this.metadata = metadata;
    }

    public String getId() {
        return id;
    }

    public String getStatus() {
        return status;
    }

    public Amount getAmount() {
        return amount;
    }

    public String getPaidAt() {
        return paidAt;
    }

    public Map<String, String> getMetadata() {
        return metadata;
    }

    public Amount getAmountChargedBack() {
        return amountChargedBack;
    }

    /** Of Mollie een terugboeking meldt (een teruggeboekt bedrag groter dan nul). */
    public boolean isChargedBack() {
        if (amountChargedBack == null || amountChargedBack.getValue() == null) {
            return false;
        }
        try {
            return new java.math.BigDecimal(amountChargedBack.getValue()).signum() > 0;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Amount {

        private String currency;
        private String value;

        public Amount() {
        }

        public Amount(String currency, String value) {
            this.currency = currency;
            this.value = value;
        }

        public String getCurrency() {
            return currency;
        }

        public String getValue() {
            return value;
        }
    }
}
