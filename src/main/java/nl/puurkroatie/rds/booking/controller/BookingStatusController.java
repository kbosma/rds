package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.BookingStatusDto;
import nl.puurkroatie.rds.booking.service.BookingStatusService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/booking-statuses")
public class BookingStatusController {

    private final BookingStatusService bookingStatusService;

    public BookingStatusController(BookingStatusService bookingStatusService) {
        this.bookingStatusService = bookingStatusService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<BookingStatusDto> findAll() {
        return bookingStatusService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public ResponseEntity<BookingStatusDto> findById(@PathVariable UUID id) {
        return bookingStatusService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
