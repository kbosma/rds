package nl.puurkroatie.rds.bookerportal.controller;

import nl.puurkroatie.rds.bookerportal.dto.BookerPortalAccommodationDto;
import nl.puurkroatie.rds.bookerportal.security.BookerContext;
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

    public BookerPortalBookingLineController(BookingLineRepository bookingLineRepository) {
        this.bookingLineRepository = bookingLineRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKER_PORTAL_READ')")
    public ResponseEntity<List<BookerPortalAccommodationDto>> findAll() {
        UUID bookingId = BookerContext.getBookingId();
        List<BookerPortalAccommodationDto> lines = bookingLineRepository
                .findByBookingBookingIdOrderByFromDateAsc(bookingId)
                .stream()
                .map(bl -> new BookerPortalAccommodationDto(
                        bl.getBookingLineId(),
                        bl.getAccommodation().getName(),
                        bl.getSupplier().getName(),
                        bl.getFromDate(),
                        bl.getUntilDate()
                ))
                .toList();
        return ResponseEntity.ok(lines);
    }
}
