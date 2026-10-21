package nl.puurkroatie.rds.email.repository;

import java.time.LocalDateTime;
import java.util.UUID;

/** Een verzonden e-mail zonder de inhoud, voor lijsten waar de HTML niet nodig is. */
public interface SentEmailSummary {

    UUID getSentEmailId();

    String getSubject();

    String getFromAddress();

    UUID getResentFromId();

    LocalDateTime getCreatedAt();
}
