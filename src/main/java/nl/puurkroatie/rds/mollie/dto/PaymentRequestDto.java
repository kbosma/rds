package nl.puurkroatie.rds.mollie.dto;

import java.util.Map;

public class PaymentRequestDto {

    private final Amount amount;
    private final String description;
    private final String redirectUrl;
    private final String webhookUrl;
    private final Map<String, String> metadata;

    public PaymentRequestDto(Amount amount, String description, String redirectUrl, String webhookUrl, Map<String, String> metadata) {
        this.amount = amount;
        this.description = description;
        this.redirectUrl = redirectUrl;
        this.webhookUrl = webhookUrl;
        this.metadata = metadata;
    }

    public Amount getAmount() {
        return amount;
    }

    public String getDescription() {
        return description;
    }

    public String getRedirectUrl() {
        return redirectUrl;
    }

    public String getWebhookUrl() {
        return webhookUrl;
    }

    public Map<String, String> getMetadata() {
        return metadata;
    }

    public static class Amount {

        private String currency;
        private String value;

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
