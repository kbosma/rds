package nl.puurkroatie.rds.mollie.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@ConfigurationProperties(prefix = "app.mollie")
public class MollieConfig {

    private Api api;
    private String key;
    private Urls urls;

    @Bean
    public RestClient mollieRestClient() {
        return RestClient.builder()
                .baseUrl(api.getPayments().getBase())
                .defaultHeader("Authorization", key)
                .build();
    }

    public Api getApi() {
        return api;
    }

    public void setApi(Api api) {
        this.api = api;
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public Urls getUrls() {
        return urls;
    }

    public void setUrls(Urls urls) {
        this.urls = urls;
    }

    public static class Api {

        private Payments payments;

        public Payments getPayments() {
            return payments;
        }

        public void setPayments(Payments payments) {
            this.payments = payments;
        }

        public static class Payments {

            private String base;

            public String getBase() {
                return base;
            }

            public void setBase(String base) {
                this.base = base;
            }
        }
    }

    public static class Urls {

        private String webhook;
        private String redirect;

        public String getWebhook() {
            return webhook;
        }

        public void setWebhook(String webhook) {
            this.webhook = webhook;
        }

        public String getRedirect() {
            return redirect;
        }

        public void setRedirect(String redirect) {
            this.redirect = redirect;
        }
    }
}
