package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.BookingDto;
import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.BookingStatus;
import nl.puurkroatie.rds.booking.mapper.BookingMapper;
import nl.puurkroatie.rds.booking.repository.BookerRepository;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.service.BookerStatusUpdater;
import nl.puurkroatie.rds.booking.service.DeletionGuard;
import nl.puurkroatie.rds.booking.service.BookingNumberGenerator;
import nl.puurkroatie.rds.booking.service.BookingService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final BookerRepository bookerRepository;
    private final BookingMapper bookingMapper;
    private final BookingNumberGenerator bookingNumberGenerator;

    private final DeletionGuard deletionGuard;
    private final BookerStatusUpdater bookerStatusUpdater;

    public BookingServiceImpl(BookingRepository bookingRepository, BookerRepository bookerRepository, BookingMapper bookingMapper, BookingNumberGenerator bookingNumberGenerator, DeletionGuard deletionGuard, BookerStatusUpdater bookerStatusUpdater) {
        this.bookingRepository = bookingRepository;
        this.bookerRepository = bookerRepository;
        this.bookingMapper = bookingMapper;
        this.bookingNumberGenerator = bookingNumberGenerator;
        this.deletionGuard = deletionGuard;
        this.bookerStatusUpdater = bookerStatusUpdater;
    }

    /** Een boeking ontstaat altijd vanuit een bestaande booker, met status AANVRAAG en een nog niet bevestigde offerte. */
    @Override
    public BookingDto create(BookingDto dto) {
        if (BookingStatus.fromValue(dto.getBookingStatus()) != BookingStatus.AANVRAAG) {
            throw new IllegalArgumentException("A new booking always starts with status AANVRAAG");
        }
        if (dto.getBookerId() == null) {
            throw new IllegalArgumentException("A booking can only be created for an existing booker");
        }
        String bookingNumber = bookingNumberGenerator.generate();
        Booking saved = bookingRepository.save(new Booking(resolveBooker(dto.getBookerId()), bookingNumber, BookingStatus.AANVRAAG));
        bookerStatusUpdater.refresh(dto.getBookerId());
        return bookingMapper.toDto(saved);
    }

    @Override
    public BookingDto update(UUID id, BookingDto dto) {
        Booking existing = bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        Booker booker = resolveBooker(dto.getBookerId());
        BookingStatus status = BookingStatus.fromValue(dto.getBookingStatus());
        boolean confirmed = existing.isQuoteConfirmed();
        LocalDateTime confirmedAt = existing.getQuoteConfirmedAt();

        if (confirmed && !dto.isQuoteConfirmed()) {
            throw new IllegalArgumentException("A confirmed quote cannot be unconfirmed");
        }
        if (!confirmed && dto.isQuoteConfirmed()) {
            verifyConfirmable(existing, booker);
            confirmed = true;
            confirmedAt = LocalDateTime.now();
            status = BookingStatus.BOEKING;
        }

        UUID previousBookerId = existing.getBooker() != null ? existing.getBooker().getBookerId() : null;
        Booking saved = bookingRepository.save(new Booking(id, booker, existing.getBookingNumber(), status, confirmed, confirmedAt,
                existing.getCreatedAt(), existing.getCreatedBy(), existing.getTenantOrganization()));
        bookerStatusUpdater.refresh(dto.getBookerId());
        if (previousBookerId != null && !previousBookerId.equals(dto.getBookerId())) {
            bookerStatusUpdater.refresh(previousBookerId);
        }
        return bookingMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Booking existing = bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        deletionGuard.verifyBookingDeletable(id);
        UUID bookerId = existing.getBooker() != null ? existing.getBooker().getBookerId() : null;
        bookingRepository.deleteById(id);
        bookingRepository.flush();
        bookerStatusUpdater.refresh(bookerId);
    }

    /**
     * De hoofdboeker bevestigt de laatst verstuurde offerte. Dat kan dus alleen bij een boeking in status OFFERTE
     * met een hoofdboeker. Daarna is de boeking BOEKING.
     */
    private void verifyConfirmable(Booking existing, Booker booker) {
        if (existing.getBookingStatus() != BookingStatus.OFFERTE) {
            throw new IllegalArgumentException("Only a booking with status OFFERTE can be confirmed");
        }
        if (booker == null) {
            throw new IllegalArgumentException("A booking without a main booker cannot be confirmed");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingDto> findAll() {
        if (isAdmin()) {
            return bookingRepository.findAll().stream()
                    .map(bookingMapper::toDto)
                    .toList();
        }
        return bookingRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(bookingMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BookingDto> findById(UUID id) {
        return bookingRepository.findById(id)
                .filter(entity -> isAdmin() || entity.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(bookingMapper::toDto);
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }

    private Booker resolveBooker(UUID bookerId) {
        if (bookerId == null) {
            return null;
        }
        Booker booker = bookerRepository.findById(bookerId)
                .orElseThrow(() -> new RuntimeException("Booker not found with id: " + bookerId));
        verifyOrganization(booker.getTenantOrganization());
        return booker;
    }
}
