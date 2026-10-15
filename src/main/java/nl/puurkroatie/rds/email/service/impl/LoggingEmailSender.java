package nl.puurkroatie.rds.email.service.impl;

import nl.puurkroatie.rds.email.service.EmailMessage;
import nl.puurkroatie.rds.email.service.EmailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Log-only mailer voor lokaal ontwikkelen: verstuurt niets, maar logt de
 * volledige e-mail (afzender, ontvanger, subject en body). Wordt geactiveerd
 * wanneer er geen SMTP ({@code spring.mail.host}) geconfigureerd is; zie
 * EmailSenderConfig.
 */
public class LoggingEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailSender.class);

    @Override
    public void send(EmailMessage message) {
        log.info(
                "[LOG-ONLY MAILER] Geen SMTP geconfigureerd - e-mail NIET verstuurd:\n"
                        + "  Afzender : {}\n"
                        + "  Ontvanger: {}\n"
                        + "  Subject  : {}\n"
                        + "  Body     :\n{}",
                message.getFrom(), message.getTo(), message.getSubject(), message.getBodyHtml());
    }
}
