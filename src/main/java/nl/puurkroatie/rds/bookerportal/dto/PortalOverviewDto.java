package nl.puurkroatie.rds.bookerportal.dto;

import java.util.List;

/**
 * Alles wat het dashboard nodig heeft voor de kop en de huisstijl, in één antwoord. Bewust minimaal: geen ids,
 * geen auditvelden en geen tenant-gegevens.
 */
public record PortalOverviewDto(
        PortalBookingDto booking,
        PortalBookerDto booker,
        List<PortalTravelerDto> travelers,
        PortalOrganizationDto organization) {
}
