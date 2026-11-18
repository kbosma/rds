package nl.puurkroatie.rds.demo;

import nl.puurkroatie.rds.bookerportal.service.OtpEmailService;
import nl.puurkroatie.rds.email.service.EmailAttachment;
import nl.puurkroatie.rds.email.service.EmailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

import java.time.ZoneId;
import java.util.List;

/**
 * Alles wat het demo-profiel vervangt of toevoegt. Zonder profiel {@code demo} bestaat niets hiervan: de beans,
 * de nep-Mollie, de postbus en de {@code /demo/**}-paden zijn er dan niet.
 */
@Configuration
@Profile("demo")
public class DemoConfig {

    private static final Logger log = LoggerFactory.getLogger(DemoConfig.class);

    @Bean
    @Primary
    public DemoClock demoClock() {
        return new DemoClock(ZoneId.of("Europe/Amsterdam"));
    }

    @Bean
    public DemoMailbox demoMailbox() {
        return new DemoMailbox();
    }

    /** Elke e-mail gaat naar de demo-postbus; er wordt niets echt verstuurd. */
    @Bean
    @Primary
    public EmailSender demoEmailSender(DemoMailbox mailbox) {
        return message -> {
            List<String> attachments = message.getAttachments() == null ? List.of()
                    : message.getAttachments().stream().map(EmailAttachment::filename).toList();
            DemoMailbox.Mail mail = mailbox.add(message.getFrom(), message.getTo(), message.getSubject(),
                    message.getBodyHtml(), attachments, null);
            log.info("Demo-postbus #{}: '{}' aan {}", mail.number(), mail.subject(), mail.to());
        };
    }

    /** De inlogcode van het boekerportaal komt als e-mail in de demo-postbus. */
    @Bean
    @Primary
    public OtpEmailService demoOtpEmailService(DemoMailbox mailbox) {
        return new OtpEmailService() {
            @Override
            public void sendOtp(String emailaddress, String code) {
                String html = "<p>Beste reiziger,</p><p>Je inlogcode voor het boekerportaal is:</p>"
                        + "<p style=\"font-size:28px;font-weight:700;letter-spacing:6px\">" + code + "</p>"
                        + "<p>De code is 10 minuten geldig.</p>";
                mailbox.add("noreply@demo.rds", emailaddress, "Je inlogcode voor het boekerportaal", html, List.of(), code);
                log.info("Demo-postbus: inlogcode voor {}", emailaddress);
            }
        };
    }

    /**
     * De demo-paden ({@code /demo/**}) zijn zonder inloggen bereikbaar: de nep-betaalpagina wordt door de browser van
     * de "klant" geopend en de postbus en de klok door het opnamescript. Deze keten gaat vóór de gewone keten en
     * geldt alleen voor {@code /demo/**}; alles daarbuiten blijft onder de gewone beveiliging.
     */
    @Bean
    @Order(1)
    public SecurityFilterChain demoSecurityFilterChain(HttpSecurity http) throws Exception {
        http.securityMatcher("/demo/**")
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
