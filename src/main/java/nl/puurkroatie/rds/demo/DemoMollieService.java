package nl.puurkroatie.rds.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Een nep-Mollie voor het demo-profiel. Spreekt hetzelfde JSON-formaat als de Mollie-API voor zover RDS dat gebruikt
 * (aanmaken, status opvragen), houdt de betalingen in het geheugen bij en roept na "betalen" de echte webhook van
 * RDS aan. Zo loopt in de demo exact dezelfde code als met de echte Mollie, zonder echt geld en zonder internet.
 */
@Service
@Profile("demo")
public class DemoMollieService {

    private static final Logger log = LoggerFactory.getLogger(DemoMollieService.class);
    private static final String ALPHANUMERIC = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

    /** Een betaling zoals de nep-Mollie hem kent. */
    public record DemoPayment(String id, String currency, String value, String description, String redirectUrl,
                              String webhookUrl, Map<String, Object> metadata, String status, String paidAt) {

        DemoPayment withStatus(String newStatus, String newPaidAt) {
            return new DemoPayment(id, currency, value, description, redirectUrl, webhookUrl, metadata, newStatus, newPaidAt);
        }
    }

    private final Map<String, DemoPayment> payments = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final RestClient restClient = RestClient.create();

    @SuppressWarnings("unchecked")
    public DemoPayment create(Map<String, Object> request) {
        Map<String, Object> amount = (Map<String, Object>) request.getOrDefault("amount", Map.of());
        String id = "tr_demo" + randomId(10);
        DemoPayment payment = new DemoPayment(id,
                (String) amount.getOrDefault("currency", "EUR"),
                (String) amount.getOrDefault("value", "0.00"),
                (String) request.get("description"),
                (String) request.get("redirectUrl"),
                (String) request.get("webhookUrl"),
                (Map<String, Object>) request.get("metadata"),
                "open", null);
        payments.put(id, payment);
        log.info("Nep-Mollie: betaling {} aangemaakt ({} {})", id, payment.currency(), payment.value());
        return payment;
    }

    public Optional<DemoPayment> find(String id) {
        return Optional.ofNullable(payments.get(id));
    }

    /**
     * De "klant" rondt de betaling af op de nep-betaalpagina. De nieuwe status wordt via de echte webhook aan RDS
     * gemeld, net als Mollie dat doet; RDS vraagt de status daarna zelf op bij deze nep-Mollie.
     */
    public DemoPayment complete(String id, boolean paid) {
        DemoPayment current = find(id).orElseThrow(() -> new IllegalArgumentException("Unknown demo payment: " + id));
        DemoPayment updated = paid
                ? current.withStatus("paid", OffsetDateTime.now().toString())
                : current.withStatus("canceled", null);
        payments.put(id, updated);
        if (updated.webhookUrl() != null && !updated.webhookUrl().isBlank()) {
            restClient.post()
                    .uri(updated.webhookUrl() + "?id={id}", id)
                    .retrieve()
                    .toBodilessEntity();
        }
        log.info("Nep-Mollie: betaling {} is {}", id, updated.status());
        return updated;
    }

    /** Het antwoord op aanmaken/opvragen, in het formaat van de Mollie-API. */
    public Map<String, Object> toMollieJson(DemoPayment payment, String checkoutUrl) {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("resource", "payment");
        json.put("id", payment.id());
        json.put("status", payment.status());
        json.put("amount", Map.of("currency", payment.currency(), "value", payment.value()));
        json.put("description", payment.description());
        if (payment.paidAt() != null) {
            json.put("paidAt", payment.paidAt());
        }
        if (payment.metadata() != null) {
            json.put("metadata", payment.metadata());
        }
        json.put("_links", Map.of("checkout", Map.of("href", checkoutUrl, "type", "text/html")));
        return json;
    }

    private String randomId(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(ALPHANUMERIC.charAt(random.nextInt(ALPHANUMERIC.length())));
        }
        return sb.toString();
    }
}
