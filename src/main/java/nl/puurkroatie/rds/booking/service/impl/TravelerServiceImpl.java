package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.TravelerDto;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.Gender;
import nl.puurkroatie.rds.booking.entity.Traveler;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.repository.GenderRepository;
import nl.puurkroatie.rds.booking.repository.TravelerRepository;
import nl.puurkroatie.rds.booking.service.TravelerService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TravelerServiceImpl implements TravelerService {

    private final TravelerRepository travelerRepository;
    private final BookingRepository bookingRepository;
    private final GenderRepository genderRepository;

    public TravelerServiceImpl(TravelerRepository travelerRepository, BookingRepository bookingRepository, GenderRepository genderRepository) {
        this.travelerRepository = travelerRepository;
        this.bookingRepository = bookingRepository;
        this.genderRepository = genderRepository;
    }

    @Override
    public TravelerDto create(TravelerDto dto) {
        Traveler entity = toEntity(dto);
        Traveler saved = travelerRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public TravelerDto update(UUID id, TravelerDto dto) {
        Traveler existing = travelerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Traveler not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        Traveler entity = toEntity(id, dto);
        Traveler saved = travelerRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Traveler existing = travelerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Traveler not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        travelerRepository.deleteById(id);
    }

    @Override
    public List<TravelerDto> findAll() {
        if (isAdmin()) {
            return travelerRepository.findAll().stream()
                    .map(this::toDto)
                    .toList();
        }
        return travelerRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<TravelerDto> findById(UUID id) {
        return travelerRepository.findById(id)
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

    private TravelerDto toDto(Traveler entity) {
        return new TravelerDto(
                entity.getTravelerId(),
                entity.getBooking().getBookingId(),
                entity.getFirstname(),
                entity.getPrefix(),
                entity.getLastname(),
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

    private Traveler toEntity(TravelerDto dto) {
        Booking booking = bookingRepository.findById(dto.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + dto.getBookingId()));
        return new Traveler(
                booking,
                dto.getFirstname(),
                dto.getPrefix(),
                dto.getLastname(),
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

    private Traveler toEntity(UUID id, TravelerDto dto) {
        Booking booking = bookingRepository.findById(dto.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + dto.getBookingId()));
        return new Traveler(
                id,
                booking,
                dto.getFirstname(),
                dto.getPrefix(),
                dto.getLastname(),
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
