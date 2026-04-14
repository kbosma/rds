package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.BookingLineDto;
import nl.puurkroatie.rds.booking.service.BookingLineService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/booking-lines")
public class BookingLineController {

    private final BookingLineService bookingLineService;

    public BookingLineController(BookingLineService bookingLineService) {
        this.bookingLineService = bookingLineService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<BookingLineDto> findAll() {
        return bookingLineService.findAll();
    }

    @GetMapping("/booking/{bookingId}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<BookingLineDto> findByBookingId(@PathVariable UUID bookingId) {
        return bookingLineService.findByBookingId(bookingId);
    }

    @GetMapping("/{bookingLineId}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public ResponseEntity<BookingLineDto> findById(@PathVariable UUID bookingLineId) {
        return bookingLineService.findById(bookingLineId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BOOKING_CREATE')")
    public ResponseEntity<BookingLineDto> create(@RequestBody @Valid BookingLineDto dto) {
        BookingLineDto created = bookingLineService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{bookingLineId}")
    @PreAuthorize("hasAuthority('BOOKING_UPDATE')")
    public ResponseEntity<BookingLineDto> update(@PathVariable UUID bookingLineId,
                                                 @RequestBody @Valid BookingLineDto dto) {
        BookingLineDto updated = bookingLineService.update(bookingLineId, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{bookingLineId}")
    @PreAuthorize("hasAuthority('BOOKING_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID bookingLineId) {
        bookingLineService.delete(bookingLineId);
        return ResponseEntity.noContent().build();
    }
}
