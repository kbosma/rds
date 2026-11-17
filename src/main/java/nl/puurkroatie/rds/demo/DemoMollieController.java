package nl.puurkroatie.rds.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Map;

import static org.springframework.web.util.HtmlUtils.htmlEscape;

/**
 * Nep-Mollie (alleen profiel {@code demo}): de API waar RDS in de demo tegen praat
 * ({@code app.mollie.api.payments.base}) en de betaalpagina waar de klant naartoe wordt gestuurd.
 */
@RestController
@RequestMapping("/demo/mollie")
@Profile("demo")
public class DemoMollieController {

    private final DemoMollieService mollieService;
    private final String publicBaseUrl;

    public DemoMollieController(DemoMollieService mollieService,
                                @Value("${app.demo.public-base-url}") String publicBaseUrl) {
        this.mollieService = mollieService;
        this.publicBaseUrl = publicBaseUrl;
    }

    @PostMapping("/v2/payments")
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> request) {
        DemoMollieService.DemoPayment payment = mollieService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mollieService.toMollieJson(payment, checkoutUrl(payment.id())));
    }

    @GetMapping("/v2/payments/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable String id) {
        return mollieService.find(id)
                .map(p -> ResponseEntity.ok(mollieService.toMollieJson(p, checkoutUrl(p.id()))))
                .orElse(ResponseEntity.notFound().build());
    }

    /** De betaalpagina van de nep-Mollie, zoals de klant hem ziet. */
    @GetMapping(value = "/checkout/{id}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> checkout(@PathVariable String id) {
        return mollieService.find(id)
                .map(p -> ResponseEntity.ok(DemoPages.checkout(p.id(), htmlEscape(nullToEmpty(p.description())),
                        htmlEscape(formatAmount(p.currency(), p.value())))))
                .orElse(ResponseEntity.notFound().build());
    }

    /** De klant kiest betalen of annuleren; daarna terug naar het boekerportaal. */
    @PostMapping(value = "/checkout/{id}", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Void> pay(@PathVariable String id, @RequestParam("result") String result) {
        DemoMollieService.DemoPayment payment = mollieService.complete(id, "paid".equals(result));
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(payment.redirectUrl() != null ? payment.redirectUrl() : publicBaseUrl + "/demo/mailbox"));
        return new ResponseEntity<>(headers, HttpStatus.SEE_OTHER);
    }

    private String checkoutUrl(String id) {
        return publicBaseUrl + "/demo/mollie/checkout/" + id;
    }

    private static String formatAmount(String currency, String value) {
        return ("EUR".equals(currency) ? "€ " : currency + " ") + value.replace('.', ',');
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
