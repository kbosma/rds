package nl.puurkroatie.rds.bookingstatus.controller;

import jakarta.validation.Valid;
import nl.puurkroatie.rds.booking.dto.BookingDto;
import nl.puurkroatie.rds.bookingstatus.dto.BookingStatusChangeDto;
import nl.puurkroatie.rds.bookingstatus.dto.CompleteRequestDto;
import nl.puurkroatie.rds.bookingstatus.dto.StatusRevertRequestDto;
import nl.puurkroatie.rds.bookingstatus.service.BookingStatusService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Handmatige statuswijzigingen van een boeking en de statusgeschiedenis. */
@RestController
@RequestMapping("/api/bookings/{id}")
public class BookingStatusController {

    private final BookingStatusService statusService;

    public BookingStatusController(BookingStatusService statusService) {
        this.statusService = statusService;
    }

    /** Terugzetten naar een eerdere status, met reden; na een betaling alleen met BOOKING_STATUS_REVERT_PAID (403). */
    @PostMapping("/status-revert")
    @PreAuthorize("hasAnyAuthority('BOOKING_STATUS_REVERT', 'BOOKING_STATUS_REVERT_PAID')")
    public BookingDto revert(@PathVariable UUID id, @RequestBody @Valid StatusRevertRequestDto request) {
        return statusService.revert(id, request.targetStatus(), request.reason());
    }

    @PostMapping("/complete")
    @PreAuthorize("hasAuthority('BOOKING_COMPLETE')")
    public BookingDto complete(@PathVariable UUID id, @RequestBody(required = false) @Valid CompleteRequestDto request) {
        return statusService.complete(id, request == null ? null : request.reason());
    }

    @GetMapping("/status-changes")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<BookingStatusChangeDto> history(@PathVariable UUID id) {
        return statusService.history(id);
    }
}
