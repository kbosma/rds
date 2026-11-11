package nl.puurkroatie.rds.bookingstatus.controller;

import nl.puurkroatie.rds.bookingstatus.dto.NotificationDto;
import nl.puurkroatie.rds.bookingstatus.service.NotificationService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /** Openstaande notificaties van de eigen organisatie. */
    @GetMapping("/open")
    @PreAuthorize("hasAuthority('NOTIFICATION_READ')")
    public List<NotificationDto> findOpen() {
        return notificationService.findOpen();
    }

    @GetMapping("/booking/{bookingId}")
    @PreAuthorize("hasAuthority('NOTIFICATION_READ')")
    public List<NotificationDto> findByBooking(@PathVariable UUID bookingId) {
        return notificationService.findByBooking(bookingId);
    }

    @PostMapping("/{id}/handle")
    @PreAuthorize("hasAuthority('NOTIFICATION_UPDATE')")
    public NotificationDto handle(@PathVariable UUID id) {
        return notificationService.handle(id);
    }
}
