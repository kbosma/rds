package nl.puurkroatie.rds.auth.service.impl;

import nl.puurkroatie.rds.auth.dto.OrganizationDto;
import nl.puurkroatie.rds.auth.entity.Organization;
import nl.puurkroatie.rds.auth.mapper.OrganizationMapper;
import nl.puurkroatie.rds.auth.repository.OrganizationRepository;
import nl.puurkroatie.rds.auth.service.OrganizationDeletionGuard;
import nl.puurkroatie.rds.auth.service.SystemRoles;
import nl.puurkroatie.rds.common.ConflictException;
import jakarta.persistence.EntityNotFoundException;
import nl.puurkroatie.rds.auth.service.OrganizationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class OrganizationServiceImpl implements OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMapper organizationMapper;
    private final OrganizationDeletionGuard deletionGuard;
    private final SystemRoles systemRoles;

    public OrganizationServiceImpl(OrganizationRepository organizationRepository, OrganizationMapper organizationMapper,
                                   OrganizationDeletionGuard deletionGuard, SystemRoles systemRoles) {
        this.organizationRepository = organizationRepository;
        this.organizationMapper = organizationMapper;
        this.deletionGuard = deletionGuard;
        this.systemRoles = systemRoles;
    }

    /** Een nieuwe klantorganisatie, met haar vergrendelde kopieën van MANAGER en EMPLOYEE. */
    @Override
    public OrganizationDto create(OrganizationDto dto) {
        Organization entity = organizationMapper.toEntity(dto);
        Organization saved = organizationRepository.saveAndFlush(entity);
        systemRoles.createForCustomer(saved.getOrganizationId());
        return organizationMapper.toDto(saved);
    }

    @Override
    public OrganizationDto update(UUID id, OrganizationDto dto) {
        Organization existing = organizationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Organization not found with id: " + id));
        Organization entity = organizationMapper.toEntity(id, dto, existing);
        Organization saved = organizationRepository.save(entity);
        return organizationMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Organization existing = organizationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Organization not found with id: " + id));
        if (existing.isPlatform()) {
            throw new ConflictException("De platformorganisatie kan niet worden verwijderd");
        }
        deletionGuard.verifyDeletable(id);
        organizationRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrganizationDto> findAll() {
        return organizationRepository.findAll().stream()
                .map(organizationMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OrganizationDto> findById(UUID id) {
        return organizationRepository.findById(id)
                .map(organizationMapper::toDto);
    }
}
