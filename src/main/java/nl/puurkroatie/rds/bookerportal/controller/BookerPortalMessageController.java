package nl.puurkroatie.rds.bookerportal.controller;

import nl.puurkroatie.rds.bookerportal.dto.PortalMessageContentDto;
import nl.puurkroatie.rds.bookerportal.dto.PortalMessageDto;
import nl.puurkroatie.rds.bookerportal.security.BookerContext;
import nl.puurkroatie.rds.bookerportal.service.BookerPortalMessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/booker-portal/messages")
public class BookerPortalMessageController {

    private final BookerPortalMessageService messageService;

    public BookerPortalMessageController(BookerPortalMessageService messageService) {
        this.messageService = messageService;
    }

    /** De verzonden e-mails van de eigen boeking, nieuwste eerst, zonder de inhoud. */
    @GetMapping
    @PreAuthorize("hasAuthority('BOOKER_PORTAL_READ')")
    public ResponseEntity<List<PortalMessageDto>> findAll() {
        return ResponseEntity.ok(messageService.findMessages(BookerContext.getBookingId()));
    }

    /** Eén verzonden e-mail van de eigen boeking met de HTML zoals verstuurd; anders 404. */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKER_PORTAL_READ')")
    public ResponseEntity<PortalMessageContentDto> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(messageService.findMessage(BookerContext.getBookingId(), id));
    }
}
