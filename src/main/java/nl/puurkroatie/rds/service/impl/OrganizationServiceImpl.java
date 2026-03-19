package nl.puurkroatie.rds.service.impl;

import nl.puurkroatie.rds.dto.OrganizationDto;
import nl.puurkroatie.rds.entity.Organization;
import nl.puurkroatie.rds.repository.OrganizationRepository;
import nl.puurkroatie.rds.service.OrganizationService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class OrganizationServiceImpl implements OrganizationService {

    private final OrganizationRepository organizationRepository;

    public OrganizationServiceImpl(OrganizationRepository organizationRepository) {
        this.organizationRepository = organizationRepository;
    }

    @Override
    public OrganizationDto create(OrganizationDto dto) {
        Organization entity = toEntity(dto);
        Organization saved = organizationRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public OrganizationDto update(UUID id, OrganizationDto dto) {
        if (!organizationRepository.findById(id).isPresent()) {
            throw new RuntimeException("Organization not found with id: " + id);
        }
        Organization entity = toEntity(id, dto);
        Organization saved = organizationRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        if (!organizationRepository.existsById(id)) {
            throw new RuntimeException("Organization not found with id: " + id);
        }
        organizationRepository.deleteById(id);
    }

    @Override
    public List<OrganizationDto> findAll() {
        return organizationRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<OrganizationDto> findById(UUID id) {
        return organizationRepository.findById(id)
                .map(this::toDto);
    }

    private OrganizationDto toDto(Organization entity) {
        return new OrganizationDto(
                entity.getOrganizationId(),
                entity.getName(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getModifiedAt(),
                entity.getModifiedBy()
        );
    }

    private Organization toEntity(OrganizationDto dto) {
        return new Organization(
                dto.getName(),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy()
        );
    }

    private Organization toEntity(UUID id, OrganizationDto dto) {
        return new Organization(
                id,
                dto.getName(),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy()
        );
    }
}
