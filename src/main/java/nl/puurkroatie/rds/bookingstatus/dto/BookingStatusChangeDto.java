package nl.puurkroatie.rds.bookingstatus.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/** Eén statuswijziging, met de leesbare naam van wie het deed (leeg bij het systeem). */
public record BookingStatusChangeDto(
        UUID bookingStatusChangeId,
        UUID bookingId,
        String fromStatus,
        String toStatus,
        boolean automatic,
        String reason,
        LocalDateTime createdAt,
        UUID createdBy,
        String createdByName) {
}
