package nl.puurkroatie.rds.bookerportal.controller;

import nl.puurkroatie.rds.bookerportal.security.BookerContext;
import nl.puurkroatie.rds.booking.dto.BookingLineDto;
import nl.puurkroatie.rds.booking.mapper.BookingLineMapper;
import nl.puurkroatie.rds.booking.repository.BookingLineRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/booker-portal/booking-lines")
public class BookerPortalBookingLineController {

    private final BookingLineRepository bookingLineRepository;
    private final BookingLineMapper bookingLineMapper;

    public BookerPortalBookingLineController(BookingLineRepository bookingLineRepository,
                                              BookingLineMapper bookingLineMapper) {
        this.bookingLineRepository = bookingLineRepository;
        this.bookingLineMapper = bookingLineMapper;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKER_PORTAL_READ')")
    public ResponseEntity<List<BookingLineDto>> findAll() {
        UUID bookingId = BookerContext.getBookingId();
        List<BookingLineDto> lines = bookingLineRepository.findByBookingBookingId(bookingId).stream()
                .map(bookingLineMapper::toDto)
                .toList();
        return ResponseEntity.ok(lines);
    }
}
