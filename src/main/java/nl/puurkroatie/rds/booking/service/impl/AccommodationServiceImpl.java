package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.AccommodationDto;
import nl.puurkroatie.rds.booking.entity.Accommodation;
import nl.puurkroatie.rds.booking.mapper.AccommodationMapper;
import nl.puurkroatie.rds.booking.repository.AccommodationRepository;
import nl.puurkroatie.rds.booking.service.AccommodationService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class AccommodationServiceImpl implements AccommodationService {

    private final AccommodationRepository accommodationRepository;
    private final AccommodationMapper accommodationMapper;

    public AccommodationServiceImpl(AccommodationRepository accommodationRepository, AccommodationMapper accommodationMapper) {
        this.accommodationRepository = accommodationRepository;
        this.accommodationMapper = accommodationMapper;
    }

    @Override
    public AccommodationDto create(AccommodationDto dto) {
        Accommodation entity = new Accommodation(
                dto.getKey(),
                dto.getName()
        );
        Accommodation saved = accommodationRepository.save(entity);
        return accommodationMapper.toDto(saved);
    }

    @Override
    public AccommodationDto update(UUID id, AccommodationDto dto) {
        Accommodation existing = accommodationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Accommodation not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        Accommodation entity = accommodationMapper.toEntity(id, dto);
        Accommodation saved = accommodationRepository.save(entity);
        return accommodationMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Accommodation existing = accommodationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Accommodation not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        accommodationRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AccommodationDto> findAll() {
        if (isAdmin()) {
            return accommodationRepository.findAll().stream()
                    .map(accommodationMapper::toDto)
                    .toList();
        }
        return accommodationRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(accommodationMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AccommodationDto> findById(UUID id) {
        return accommodationRepository.findById(id)
                .filter(entity -> isAdmin() || entity.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(accommodationMapper::toDto);
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }
}
