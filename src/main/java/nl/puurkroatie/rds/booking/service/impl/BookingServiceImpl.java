package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.BookingDto;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.BookingStatus;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.repository.BookingStatusRepository;
import nl.puurkroatie.rds.booking.service.BookingService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final BookingStatusRepository bookingStatusRepository;

    public BookingServiceImpl(BookingRepository bookingRepository, BookingStatusRepository bookingStatusRepository) {
        this.bookingRepository = bookingRepository;
        this.bookingStatusRepository = bookingStatusRepository;
    }

    @Override
    public BookingDto create(BookingDto dto) {
        Booking entity = toEntity(dto);
        Booking saved = bookingRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public BookingDto update(UUID id, BookingDto dto) {
        Booking existing = bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        Booking entity = toEntity(id, dto);
        Booking saved = bookingRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Booking existing = bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        bookingRepository.deleteById(id);
    }

    @Override
    public List<BookingDto> findAll() {
        if (isAdmin()) {
            return bookingRepository.findAll().stream()
                    .map(this::toDto)
                    .toList();
        }
        return bookingRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<BookingDto> findById(UUID id) {
        return bookingRepository.findById(id)
                .filter(entity -> isAdmin() || entity.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(this::toDto);
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }

    private BookingDto toDto(Booking entity) {
        return new BookingDto(
                entity.getBookingId(),
                entity.getBookingNumber(),
                entity.getBookingStatus().getBookingstatusId(),
                entity.getFromDate(),
                entity.getUntilDate(),
                entity.getTotalSum(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getModifiedAt(),
                entity.getModifiedBy(),
                entity.getTenantOrganization()
        );
    }

    private Booking toEntity(BookingDto dto) {
        BookingStatus bookingStatus = bookingStatusRepository.findById(dto.getBookingStatusId())
                .orElseThrow(() -> new RuntimeException("BookingStatus not found with id: " + dto.getBookingStatusId()));
        return new Booking(
                dto.getBookingNumber(),
                bookingStatus,
                dto.getFromDate(),
                dto.getUntilDate(),
                dto.getTotalSum(),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy(),
                TenantContext.getOrganizationId()
        );
    }

    private Booking toEntity(UUID id, BookingDto dto) {
        BookingStatus bookingStatus = bookingStatusRepository.findById(dto.getBookingStatusId())
                .orElseThrow(() -> new RuntimeException("BookingStatus not found with id: " + dto.getBookingStatusId()));
        return new Booking(
                id,
                dto.getBookingNumber(),
                bookingStatus,
                dto.getFromDate(),
                dto.getUntilDate(),
                dto.getTotalSum(),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy(),
                TenantContext.getOrganizationId()
        );
    }
}
