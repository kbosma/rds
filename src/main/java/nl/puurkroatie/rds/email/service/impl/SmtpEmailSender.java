package nl.puurkroatie.rds.email.service.impl;

import jakarta.mail.internet.MimeMessage;
import nl.puurkroatie.rds.email.service.EmailMessage;
import nl.puurkroatie.rds.email.service.EmailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

import java.nio.charset.StandardCharsets;

/**
 * Verstuurt e-mail via de centrale SMTP-relay (JavaMailSender). Wordt alleen
 * geactiveerd wanneer {@code spring.mail.host} geconfigureerd is; zie
 * EmailSenderConfig.
 */
public class SmtpEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailSender.class);

    private final JavaMailSender mailSender;

    public SmtpEmailSender(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void send(EmailMessage message) {
        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, StandardCharsets.UTF_8.name());
            helper.setFrom(message.getFrom());
            helper.setTo(message.getTo());
            helper.setSubject(message.getSubject());
            helper.setText(message.getBodyHtml(), true); // true = HTML-body
            mailSender.send(mime);
            log.info("E-mail verstuurd naar {} (afzender {})", message.getTo(), message.getFrom());
        } catch (Exception e) {
            throw new RuntimeException("Versturen van e-mail mislukt: " + e.getMessage(), e);
        }
    }
}
