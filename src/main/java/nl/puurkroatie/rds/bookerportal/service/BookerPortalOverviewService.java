package nl.puurkroatie.rds.bookerportal.service;

import jakarta.persistence.EntityNotFoundException;
import nl.puurkroatie.rds.auth.entity.Organization;
import nl.puurkroatie.rds.auth.entity.OrganizationTheme;
import nl.puurkroatie.rds.auth.repository.OrganizationRepository;
import nl.puurkroatie.rds.auth.repository.OrganizationThemeRepository;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.bookerportal.dto.PortalOrganizationDto;
import nl.puurkroatie.rds.bookerportal.dto.PortalOverviewDto;
import nl.puurkroatie.rds.bookerportal.mapper.PortalMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * De kerngegevens voor het dashboard van het boekerportaal. De boeking komt uit het token (niet uit de
 * aanroep), zodat een klant nooit een andere boeking kan opvragen.
 */
@Service
@Transactional(readOnly = true)
public class BookerPortalOverviewService {

    private final BookingRepository bookingRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationThemeRepository organizationThemeRepository;
    private final PortalMapper portalMapper;

    public BookerPortalOverviewService(BookingRepository bookingRepository,
                                       OrganizationRepository organizationRepository,
                                       OrganizationThemeRepository organizationThemeRepository,
                                       PortalMapper portalMapper) {
        this.bookingRepository = bookingRepository;
        this.organizationRepository = organizationRepository;
        this.organizationThemeRepository = organizationThemeRepository;
        this.portalMapper = portalMapper;
    }

    public PortalOverviewDto findOverview(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found"));

        return new PortalOverviewDto(
                portalMapper.toBookingDto(booking),
                booking.getBooker() == null ? null : portalMapper.toBookerDto(booking.getBooker()),
                booking.getTravelers().stream().map(portalMapper::toTravelerDto).toList(),
                findOrganization(booking.getTenantOrganization()));
    }

    private PortalOrganizationDto findOrganization(UUID organizationId) {
        Organization organization = organizationRepository.findById(organizationId).orElse(null);
        if (organization == null) {
            return null;
        }
        OrganizationTheme theme = organizationThemeRepository
                .findByOrganization_OrganizationId(organizationId).orElse(null);
        return portalMapper.toOrganizationDto(organization, theme);
    }
}
