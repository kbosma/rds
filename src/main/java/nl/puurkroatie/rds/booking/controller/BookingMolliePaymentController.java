package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.BookingMolliePaymentDto;
import nl.puurkroatie.rds.booking.service.BookingMolliePaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/booking-mollie-payments")
public class BookingMolliePaymentController {

    private final BookingMolliePaymentService bookingMolliePaymentService;

    public BookingMolliePaymentController(BookingMolliePaymentService bookingMolliePaymentService) {
        this.bookingMolliePaymentService = bookingMolliePaymentService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PAYMENT_READ')")
    public List<BookingMolliePaymentDto> findAll() {
        return bookingMolliePaymentService.findAll();
    }

    @GetMapping("/{bookingId}")
    @PreAuthorize("hasAuthority('PAYMENT_READ')")
    public List<BookingMolliePaymentDto> findByBookingId(@PathVariable UUID bookingId) {
        return bookingMolliePaymentService.findByBookingId(bookingId);
    }

    @GetMapping("/{bookingId}/{molliePaymentId}")
    @PreAuthorize("hasAuthority('PAYMENT_READ')")
    public ResponseEntity<BookingMolliePaymentDto> findById(@PathVariable UUID bookingId, @PathVariable UUID molliePaymentId) {
        return bookingMolliePaymentService.findById(bookingId, molliePaymentId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PAYMENT_CREATE')")
    public ResponseEntity<BookingMolliePaymentDto> create(@RequestBody @Valid BookingMolliePaymentDto dto) {
        BookingMolliePaymentDto created = bookingMolliePaymentService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/{bookingId}/{molliePaymentId}")
    @PreAuthorize("hasAuthority('PAYMENT_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID bookingId, @PathVariable UUID molliePaymentId) {
        bookingMolliePaymentService.delete(bookingId, molliePaymentId);
        return ResponseEntity.noContent().build();
    }
}
