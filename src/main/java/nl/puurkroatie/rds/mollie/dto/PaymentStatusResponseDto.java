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
