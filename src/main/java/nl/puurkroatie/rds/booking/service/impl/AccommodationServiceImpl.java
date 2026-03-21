package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.AccommodationDto;
import nl.puurkroatie.rds.booking.entity.Accommodation;
import nl.puurkroatie.rds.booking.repository.AccommodationRepository;
import nl.puurkroatie.rds.booking.service.AccommodationService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AccommodationServiceImpl implements AccommodationService {

    private final AccommodationRepository accommodationRepository;

    public AccommodationServiceImpl(AccommodationRepository accommodationRepository) {
        this.accommodationRepository = accommodationRepository;
    }

    @Override
    public AccommodationDto create(AccommodationDto dto) {
        Accommodation entity = toEntity(dto);
        Accommodation saved = accommodationRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public AccommodationDto update(UUID id, AccommodationDto dto) {
        Accommodation existing = accommodationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Accommodation not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        Accommodation entity = toEntity(id, dto);
        Accommodation saved = accommodationRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Accommodation existing = accommodationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Accommodation not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        accommodationRepository.deleteById(id);
    }

    @Override
    public List<AccommodationDto> findAll() {
        if (isAdmin()) {
            return accommodationRepository.findAll().stream()
                    .map(this::toDto)
                    .toList();
        }
        return accommodationRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<AccommodationDto> findById(UUID id) {
        return accommodationRepository.findById(id)
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

    private AccommodationDto toDto(Accommodation entity) {
        return new AccommodationDto(
                entity.getAccommodationId(),
                entity.getKey(),
                entity.getName(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getModifiedAt(),
                entity.getModifiedBy(),
                entity.getTenantOrganization()
        );
    }

    private Accommodation toEntity(AccommodationDto dto) {
        return new Accommodation(
                dto.getKey(),
                dto.getName(),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy(),
                TenantContext.getOrganizationId()
        );
    }

    private Accommodation toEntity(UUID id, AccommodationDto dto) {
        return new Accommodation(
                id,
                dto.getKey(),
                dto.getName(),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy(),
                TenantContext.getOrganizationId()
        );
    }
}
