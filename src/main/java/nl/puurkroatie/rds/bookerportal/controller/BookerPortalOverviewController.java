package nl.puurkroatie.rds.bookerportal.controller;

import nl.puurkroatie.rds.bookerportal.dto.PortalOverviewDto;
import nl.puurkroatie.rds.bookerportal.security.BookerContext;
import nl.puurkroatie.rds.bookerportal.service.BookerPortalOverviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/booker-portal/overview")
public class BookerPortalOverviewController {

    private final BookerPortalOverviewService overviewService;

    public BookerPortalOverviewController(BookerPortalOverviewService overviewService) {
        this.overviewService = overviewService;
    }

    /** Kerngegevens van de eigen boeking en de huisstijl van de organisatie, voor het dashboard. */
    @GetMapping
    @PreAuthorize("hasAuthority('BOOKER_PORTAL_READ')")
    public ResponseEntity<PortalOverviewDto> getOverview() {
        return ResponseEntity.ok(overviewService.findOverview(BookerContext.getBookingId()));
    }
}
