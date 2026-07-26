package nl.puurkroatie.rds.bookerportal.controller;

import nl.puurkroatie.rds.bookerportal.dto.ItineraryItemDto;
import nl.puurkroatie.rds.bookerportal.security.BookerContext;
import nl.puurkroatie.rds.booking.entity.BookingActivity;
import nl.puurkroatie.rds.booking.entity.BookingLine;
import nl.puurkroatie.rds.booking.repository.BookingActivityRepository;
import nl.puurkroatie.rds.booking.repository.BookingLineRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/booker-portal/itinerary")
public class BookerPortalItineraryController {

    private final BookingLineRepository bookingLineRepository;
    private final BookingActivityRepository bookingActivityRepository;

    public BookerPortalItineraryController(BookingLineRepository bookingLineRepository,
                                           BookingActivityRepository bookingActivityRepository) {
        this.bookingLineRepository = bookingLineRepository;
        this.bookingActivityRepository = bookingActivityRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKER_PORTAL_READ')")
    public ResponseEntity<List<ItineraryItemDto>> getItinerary() {
        UUID bookingId = BookerContext.getBookingId();

        List<ItineraryItemDto> items = new ArrayList<>();

        bookingLineRepository.findByBookingBookingId(bookingId).forEach(line ->
                items.add(fromBookingLine(line)));

        bookingActivityRepository.findByBookingBookingId(bookingId).forEach(activity ->
                items.add(fromBookingActivity(activity)));

        items.sort(Comparator.comparing(ItineraryItemDto::getStartDate,
                Comparator.nullsLast(Comparator.naturalOrder())));

        return ResponseEntity.ok(items);
    }

    private ItineraryItemDto fromBookingLine(BookingLine line) {
        LocalDateTime startDate = line.getFromDate() != null ? line.getFromDate().atStartOfDay() : null;
        LocalDateTime endDate = line.getUntilDate() != null ? line.getUntilDate().atStartOfDay() : null;
        String description = line.getAccommodation().getName();
        String location = line.getSupplier().getName();
        return new ItineraryItemDto(line.getBookingLineId(), ItineraryItemDto.ItemType.ACCOMMODATION,
                description, startDate, endDate, location);
    }

    private ItineraryItemDto fromBookingActivity(BookingActivity activity) {
        String description = activity.getActivity().getName();
        String location = activity.getMeetingPoint();
        return new ItineraryItemDto(activity.getBookingActivityId(), ItineraryItemDto.ItemType.ACTIVITY,
                description, activity.getFromDate(), activity.getUntilDate(), location);
    }
}
