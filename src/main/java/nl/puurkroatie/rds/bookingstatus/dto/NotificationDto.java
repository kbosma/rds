package nl.puurkroatie.rds.bookingstatus.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/** Een notificatie bij een boeking, met boekingsnummer en (na afhandelen) wie en wanneer. */
public record NotificationDto(
        UUID notificationId,
        UUID bookingId,
        String bookingNumber,
        String kind,
        String title,
        LocalDateTime notifiedAt,
        boolean handled,
        LocalDateTime handledAt,
        UUID handledBy,
        String handledByName) {
}
