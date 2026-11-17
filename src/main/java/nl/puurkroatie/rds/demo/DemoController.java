package nl.puurkroatie.rds.demo;

import org.springframework.context.annotation.Profile;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Hulpmiddelen voor het opnemen van het boekingsfilmpje (alleen profiel {@code demo}): de postbus bekijken en de
 * tijd laten verstrijken.
 */
@RestController
@RequestMapping("/demo")
@Profile("demo")
public class DemoController {

    private final DemoMailbox mailbox;
    private final DemoTimeService timeService;

    public DemoController(DemoMailbox mailbox, DemoTimeService timeService) {
        this.mailbox = mailbox;
        this.timeService = timeService;
    }

    /** De postbus als webpagina; {@code n} kiest een mail (standaard de nieuwste), {@code to} filtert op ontvanger. */
    @GetMapping(value = "/mailbox", produces = MediaType.TEXT_HTML_VALUE)
    public String mailboxPage(@RequestParam(value = "n", required = false) Integer number,
                              @RequestParam(value = "to", required = false) String to) {
        var mails = mailbox.all().stream()
                .filter(m -> to == null || to.isBlank() || m.to().equalsIgnoreCase(to))
                .toList();
        DemoMailbox.Mail selected = number == null
                ? mails.stream().findFirst().orElse(null)
                : mails.stream().filter(m -> m.number() == number).findFirst().orElse(null);
        return DemoPages.mailbox(mails, selected, to);
    }

    /** De nieuwste mail (aan {@code to}), voor het opnamescript; bevat bij een inlogmail ook de code. */
    @GetMapping("/mailbox/latest")
    public ResponseEntity<Map<String, Object>> latest(@RequestParam(value = "to", required = false) String to) {
        return mailbox.latest(to).map(m -> {
            Map<String, Object> json = new LinkedHashMap<>();
            json.put("number", m.number());
            json.put("to", m.to());
            json.put("subject", m.subject());
            json.put("attachments", m.attachmentNames());
            json.put("code", m.code());
            return ResponseEntity.ok(json);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/clock")
    public Map<String, Object> clock() {
        return Map.of("today", timeService.today().toString());
    }

    /** Zet "vandaag" op {@code date} en laat de statusengine rekenen. */
    @PostMapping("/clock")
    public Map<String, Object> setClock(@RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return Map.of("today", timeService.setToday(date).toString());
    }

    @DeleteMapping("/clock")
    public Map<String, Object> resetClock() {
        return Map.of("today", timeService.reset().toString());
    }
}
