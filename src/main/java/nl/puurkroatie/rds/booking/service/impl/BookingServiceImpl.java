package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.BookingDto;
import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.BookingStatus;
import nl.puurkroatie.rds.booking.mapper.BookingMapper;
import nl.puurkroatie.rds.booking.repository.BookerRepository;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.service.BookingNumberGenerator;
import nl.puurkroatie.rds.booking.service.BookingService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public BookingServiceImpl(BookingRepository bookingRepository, BookerRepository bookerRepository, BookingMapper bookingMapper, BookingNumberGenerator bookingNumberGenerator) {
        this.bookingRepository = bookingRepository;
        this.bookerRepository = bookerRepository;
        this.bookingMapper = bookingMapper;
        this.bookingNumberGenerator = bookingNumberGenerator;
    }

    @Override
    public BookingDto create(BookingDto dto) {
        String bookingNumber = bookingNumberGenerator.generate();
        Booking entity = toEntity(dto, bookingNumber);
        Booking saved = bookingRepository.save(entity);
        return bookingMapper.toDto(saved);
    }

    @Override
    public BookingDto update(UUID id, BookingDto dto) {
        Booking existing = bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        Booking entity = toEntity(id, dto, existing.getBookingNumber());
        Booking saved = bookingRepository.save(entity);
        return bookingMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Booking existing = bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        bookingRepository.deleteById(id);
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
        return bookerRepository.findById(bookerId)
                .orElseThrow(() -> new RuntimeException("Booker not found with id: " + bookerId));
    }

    private Booking toEntity(BookingDto dto, String bookingNumber) {
        BookingStatus bookingStatus = BookingStatus.fromValue(dto.getBookingStatus());
        return new Booking(
                resolveBooker(dto.getBookerId()),
                bookingNumber,
                bookingStatus
        );
    }

    private Booking toEntity(UUID id, BookingDto dto, String bookingNumber) {
        BookingStatus bookingStatus = BookingStatus.fromValue(dto.getBookingStatus());
        return new Booking(
                id,
                resolveBooker(dto.getBookerId()),
                bookingNumber,
                bookingStatus
        );
    }
}
