package nl.puurkroatie.rds.bookingstatus.service;

import nl.puurkroatie.rds.bookingstatus.dto.NotificationDto;

import java.util.List;
import java.util.UUID;

public interface NotificationService {

    /** Openstaande notificaties van de eigen organisatie (ADMIN: alle), nieuwste eerst. */
    List<NotificationDto> findOpen();

    /** Alle notificaties van een boeking, nieuwste eerst. */
    List<NotificationDto> findByBooking(UUID bookingId);

    /** Handelt een notificatie af (wie, wanneer); al afgehandeld blijft ongewijzigd. */
    NotificationDto handle(UUID notificationId);
}
