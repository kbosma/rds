package nl.puurkroatie.rds.mollie.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class PaymentResponseDto {

    private String id;
    private String status;
    private Amount amount;
    private String description;

    @JsonProperty("_links")
    private Links links;

    public PaymentResponseDto() {
    }

    public PaymentResponseDto(String id, String status, Amount amount, String description, Links links) {
        this.id = id;
        this.status = status;
        this.amount = amount;
        this.description = description;
        this.links = links;
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

    public String getDescription() {
        return description;
    }

    public Links getLinks() {
        return links;
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

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Links {

        private Checkout checkout;

        public Links() {
        }

        public Links(Checkout checkout) {
            this.checkout = checkout;
        }

        public Checkout getCheckout() {
            return checkout;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Checkout {

        private String href;

        public Checkout() {
        }

        public Checkout(String href) {
            this.href = href;
        }

        public String getHref() {
            return href;
        }
    }
}
