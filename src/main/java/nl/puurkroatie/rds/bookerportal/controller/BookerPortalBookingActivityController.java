package nl.puurkroatie.rds.bookerportal.controller;

import nl.puurkroatie.rds.bookerportal.security.BookerContext;
import nl.puurkroatie.rds.booking.dto.BookingActivityDto;
import nl.puurkroatie.rds.booking.mapper.BookingActivityMapper;
import nl.puurkroatie.rds.booking.repository.BookingActivityRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/booker-portal/booking-activities")
public class BookerPortalBookingActivityController {

    private final BookingActivityRepository bookingActivityRepository;
    private final BookingActivityMapper bookingActivityMapper;

    public BookerPortalBookingActivityController(BookingActivityRepository bookingActivityRepository,
                                                 BookingActivityMapper bookingActivityMapper) {
        this.bookingActivityRepository = bookingActivityRepository;
        this.bookingActivityMapper = bookingActivityMapper;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKER_PORTAL_READ')")
    public ResponseEntity<List<BookingActivityDto>> findAll() {
        UUID bookingId = BookerContext.getBookingId();
        List<BookingActivityDto> activities = bookingActivityRepository.findByBookingBookingId(bookingId).stream()
                .map(bookingActivityMapper::toDto)
                .toList();
        return ResponseEntity.ok(activities);
    }
}
