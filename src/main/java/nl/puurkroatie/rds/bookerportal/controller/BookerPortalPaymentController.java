package nl.puurkroatie.rds.bookerportal.controller;

import nl.puurkroatie.rds.bookerportal.security.BookerContext;
import nl.puurkroatie.rds.bookerportal.service.BookerPortalPaymentService;
import nl.puurkroatie.rds.mollie.dto.MolliePaymentDto;
import nl.puurkroatie.rds.mollie.dto.PaymentResponseDto;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/booker-portal/payments")
public class BookerPortalPaymentController {

    private final BookerPortalPaymentService bookerPortalPaymentService;

    public BookerPortalPaymentController(BookerPortalPaymentService bookerPortalPaymentService) {
        this.bookerPortalPaymentService = bookerPortalPaymentService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKER_PORTAL_READ')")
    public ResponseEntity<List<MolliePaymentDto>> findAll() {
        UUID bookingId = BookerContext.getBookingId();
        return ResponseEntity.ok(bookerPortalPaymentService.findPaymentsByBookingId(bookingId));
    }

    @PostMapping("/pay/{molliePaymentId}")
    @PreAuthorize("hasAuthority('BOOKER_PORTAL_UPDATE')")
    public ResponseEntity<PaymentResponseDto> initiatePayment(@PathVariable UUID molliePaymentId) {
        UUID bookingId = BookerContext.getBookingId();
        PaymentResponseDto response = bookerPortalPaymentService.initiatePayment(molliePaymentId, bookingId);
        return ResponseEntity.ok(response);
    }
}
