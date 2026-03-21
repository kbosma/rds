package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.BookerDto;
import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.Gender;
import nl.puurkroatie.rds.booking.repository.BookerRepository;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.repository.GenderRepository;
import nl.puurkroatie.rds.booking.service.BookerService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class BookerServiceImpl implements BookerService {

    private final BookerRepository bookerRepository;
    private final BookingRepository bookingRepository;
    private final GenderRepository genderRepository;

    public BookerServiceImpl(BookerRepository bookerRepository, BookingRepository bookingRepository, GenderRepository genderRepository) {
        this.bookerRepository = bookerRepository;
        this.bookingRepository = bookingRepository;
        this.genderRepository = genderRepository;
    }

    @Override
    public BookerDto create(BookerDto dto) {
        Booker entity = toEntity(dto);
        Booker saved = bookerRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public BookerDto update(UUID id, BookerDto dto) {
        Booker existing = bookerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booker not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        Booker entity = toEntity(id, dto);
        Booker saved = bookerRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Booker existing = bookerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booker not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        bookerRepository.deleteById(id);
    }

    @Override
    public List<BookerDto> findAll() {
        if (isAdmin()) {
            return bookerRepository.findAll().stream()
                    .map(this::toDto)
                    .toList();
        }
        return bookerRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<BookerDto> findById(UUID id) {
        return bookerRepository.findById(id)
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

    private BookerDto toDto(Booker entity) {
        return new BookerDto(
                entity.getBookerId(),
                entity.getBooking().getBookingId(),
                entity.getFirstname(),
                entity.getPrefix(),
                entity.getLastname(),
                entity.getCallsign(),
                entity.getTelephone(),
                entity.getEmailaddress(),
                entity.getGender() != null ? entity.getGender().getGenderId() : null,
                entity.getBirthdate(),
                entity.getInitials(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getModifiedAt(),
                entity.getModifiedBy(),
                entity.getTenantOrganization()
        );
    }

    private Gender resolveGender(UUID genderId) {
        if (genderId == null) {
            return null;
        }
        return genderRepository.findById(genderId)
                .orElseThrow(() -> new RuntimeException("Gender not found with id: " + genderId));
    }

    private Booker toEntity(BookerDto dto) {
        Booking booking = bookingRepository.findById(dto.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + dto.getBookingId()));
        return new Booker(
                booking,
                dto.getFirstname(),
                dto.getPrefix(),
                dto.getLastname(),
                dto.getCallsign(),
                dto.getTelephone(),
                dto.getEmailaddress(),
                resolveGender(dto.getGenderId()),
                dto.getBirthdate(),
                dto.getInitials(),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy(),
                TenantContext.getOrganizationId()
        );
    }

    private Booker toEntity(UUID id, BookerDto dto) {
        Booking booking = bookingRepository.findById(dto.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + dto.getBookingId()));
        return new Booker(
                id,
                booking,
                dto.getFirstname(),
                dto.getPrefix(),
                dto.getLastname(),
                dto.getCallsign(),
                dto.getTelephone(),
                dto.getEmailaddress(),
                resolveGender(dto.getGenderId()),
                dto.getBirthdate(),
                dto.getInitials(),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy(),
                TenantContext.getOrganizationId()
        );
    }
}
