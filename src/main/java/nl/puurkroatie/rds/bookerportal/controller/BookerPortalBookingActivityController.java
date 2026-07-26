package nl.puurkroatie.rds.bookerportal.controller;

import nl.puurkroatie.rds.bookerportal.dto.BookerPortalActivityDto;
import nl.puurkroatie.rds.bookerportal.security.BookerContext;
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

    public BookerPortalBookingActivityController(BookingActivityRepository bookingActivityRepository) {
        this.bookingActivityRepository = bookingActivityRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKER_PORTAL_READ')")
    public ResponseEntity<List<BookerPortalActivityDto>> findAll() {
        UUID bookingId = BookerContext.getBookingId();
        List<BookerPortalActivityDto> activities = bookingActivityRepository
                .findByBookingBookingIdOrderByFromDateAsc(bookingId)
                .stream()
                .map(ba -> new BookerPortalActivityDto(
                        ba.getBookingActivityId(),
                        ba.getActivity().getName(),
                        ba.getActivity().getDescription(),
                        ba.getFromDate(),
                        ba.getUntilDate(),
                        ba.getMeetingPoint(),
                        ba.getActivity().getActivityType().name()
                ))
                .toList();
        return ResponseEntity.ok(activities);
    }
}
