package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.BookingActivityDto;
import nl.puurkroatie.rds.booking.service.BookingActivityService;
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
@RequestMapping("/api/booking-activities")
public class BookingActivityController {

    private final BookingActivityService bookingActivityService;

    public BookingActivityController(BookingActivityService bookingActivityService) {
        this.bookingActivityService = bookingActivityService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<BookingActivityDto> findAll() {
        return bookingActivityService.findAll();
    }

    @GetMapping("/booking/{bookingId}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<BookingActivityDto> findByBookingId(@PathVariable UUID bookingId) {
        return bookingActivityService.findByBookingId(bookingId);
    }

    @GetMapping("/{bookingActivityId}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public ResponseEntity<BookingActivityDto> findById(@PathVariable UUID bookingActivityId) {
        return bookingActivityService.findById(bookingActivityId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BOOKING_CREATE')")
    public ResponseEntity<BookingActivityDto> create(@RequestBody @Valid BookingActivityDto dto) {
        BookingActivityDto created = bookingActivityService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{bookingActivityId}")
    @PreAuthorize("hasAuthority('BOOKING_UPDATE')")
    public ResponseEntity<BookingActivityDto> update(@PathVariable UUID bookingActivityId,
                                                     @RequestBody @Valid BookingActivityDto dto) {
        BookingActivityDto updated = bookingActivityService.update(bookingActivityId, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{bookingActivityId}")
    @PreAuthorize("hasAuthority('BOOKING_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID bookingActivityId) {
        bookingActivityService.delete(bookingActivityId);
        return ResponseEntity.noContent().build();
    }
}
