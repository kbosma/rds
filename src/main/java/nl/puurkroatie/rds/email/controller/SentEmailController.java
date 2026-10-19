package nl.puurkroatie.rds.email.controller;

import nl.puurkroatie.rds.email.dto.SentEmailDto;
import nl.puurkroatie.rds.email.service.SentEmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Verzonden e-mails aan de hoofdboeker (alleen lezen en opnieuw versturen; nooit wijzigen of verwijderen). */
@RestController
@RequestMapping("/api/sent-emails")
public class SentEmailController {

    private final SentEmailService sentEmailService;

    public SentEmailController(SentEmailService sentEmailService) {
        this.sentEmailService = sentEmailService;
    }

    @GetMapping("/booking/{bookingId}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public ResponseEntity<List<SentEmailDto>> findByBooking(@PathVariable UUID bookingId) {
        return ResponseEntity.ok(sentEmailService.findByBooking(bookingId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public ResponseEntity<SentEmailDto> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(sentEmailService.findById(id));
    }

    @PostMapping("/{id}/resend")
    @PreAuthorize("hasAuthority('EMAIL_SEND')")
    public ResponseEntity<SentEmailDto> resend(@PathVariable UUID id) {
        return ResponseEntity.status(201).body(sentEmailService.resend(id));
    }
}
