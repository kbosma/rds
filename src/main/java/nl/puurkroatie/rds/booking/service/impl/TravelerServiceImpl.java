package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.TravelerDto;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.Gender;
import nl.puurkroatie.rds.booking.entity.Traveler;
import nl.puurkroatie.rds.booking.mapper.TravelerMapper;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.repository.TravelerRepository;
import nl.puurkroatie.rds.booking.service.TravelerService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class TravelerServiceImpl implements TravelerService {

    private final TravelerRepository travelerRepository;
    private final BookingRepository bookingRepository;
    private final TravelerMapper travelerMapper;

    public TravelerServiceImpl(TravelerRepository travelerRepository, BookingRepository bookingRepository, TravelerMapper travelerMapper) {
        this.travelerRepository = travelerRepository;
        this.bookingRepository = bookingRepository;
        this.travelerMapper = travelerMapper;
    }

    @Override
    public TravelerDto create(TravelerDto dto) {
        Traveler entity = toEntity(dto);
        Traveler saved = travelerRepository.save(entity);
        return travelerMapper.toDto(saved);
    }

    @Override
    public TravelerDto update(UUID id, TravelerDto dto) {
        Traveler existing = travelerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Traveler not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        Traveler entity = toEntity(id, dto);
        Traveler saved = travelerRepository.save(entity);
        return travelerMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Traveler existing = travelerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Traveler not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        travelerRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TravelerDto> findAll() {
        if (isAdmin()) {
            return travelerRepository.findAll().stream()
                    .map(travelerMapper::toDto)
                    .toList();
        }
        return travelerRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(travelerMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<TravelerDto> findById(UUID id) {
        return travelerRepository.findById(id)
                .filter(entity -> isAdmin() || entity.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(travelerMapper::toDto);
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }

    private Traveler toEntity(TravelerDto dto) {
        Booking booking = bookingRepository.findById(dto.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + dto.getBookingId()));
        Gender gender = dto.getGender() != null ? Gender.fromValue(dto.getGender()) : null;
        return new Traveler(
                booking,
                dto.getFirstname(),
                dto.getPrefix(),
                dto.getLastname(),
                gender,
                dto.getBirthdate(),
                dto.getInitials()
        );
    }

    private Traveler toEntity(UUID id, TravelerDto dto) {
        Booking booking = bookingRepository.findById(dto.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + dto.getBookingId()));
        Gender gender = dto.getGender() != null ? Gender.fromValue(dto.getGender()) : null;
        return new Traveler(
                id,
                booking,
                dto.getFirstname(),
                dto.getPrefix(),
                dto.getLastname(),
                gender,
                dto.getBirthdate(),
                dto.getInitials()
        );
    }
}
