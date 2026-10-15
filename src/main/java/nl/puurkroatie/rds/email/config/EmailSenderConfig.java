package nl.puurkroatie.rds.email.config;

import nl.puurkroatie.rds.email.service.EmailSender;
import nl.puurkroatie.rds.email.service.impl.LoggingEmailSender;
import nl.puurkroatie.rds.email.service.impl.SmtpEmailSender;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;

/**
 * Kiest de {@link EmailSender}-implementatie op basis van de configuratie:
 * <ul>
 *   <li>Is {@code spring.mail.host} gezet (test/productie, via env-vars), dan
 *       versturen we echt via de centrale SMTP-relay.</li>
 *   <li>Is er geen SMTP geconfigureerd (lokaal ontwikkelen), dan valt het
 *       systeem terug op een log-only mailer die niets verstuurt maar alles
 *       logt.</li>
 * </ul>
 * De methodes worden in volgorde geëvalueerd: staat er een SMTP-bean, dan slaat
 * {@code @ConditionalOnMissingBean} de log-only variant over.
 */
@Configuration
public class EmailSenderConfig {

    @Bean
    @ConditionalOnProperty(prefix = "spring.mail", name = "host")
    public EmailSender smtpEmailSender(JavaMailSender mailSender) {
        return new SmtpEmailSender(mailSender);
    }

    @Bean
    @ConditionalOnMissingBean(EmailSender.class)
    public EmailSender loggingEmailSender() {
        return new LoggingEmailSender();
    }
}
