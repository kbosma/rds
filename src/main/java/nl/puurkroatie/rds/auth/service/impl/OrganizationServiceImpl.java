package nl.puurkroatie.rds.auth.service.impl;

import nl.puurkroatie.rds.auth.dto.OrganizationDto;
import nl.puurkroatie.rds.auth.entity.Organization;
import nl.puurkroatie.rds.auth.mapper.OrganizationMapper;
import nl.puurkroatie.rds.auth.repository.OrganizationRepository;
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

    public OrganizationServiceImpl(OrganizationRepository organizationRepository, OrganizationMapper organizationMapper) {
        this.organizationRepository = organizationRepository;
        this.organizationMapper = organizationMapper;
    }

    @Override
    public OrganizationDto create(OrganizationDto dto) {
        Organization entity = organizationMapper.toEntity(dto);
        Organization saved = organizationRepository.save(entity);
        return organizationMapper.toDto(saved);
    }

    @Override
    public OrganizationDto update(UUID id, OrganizationDto dto) {
        if (!organizationRepository.findById(id).isPresent()) {
            throw new RuntimeException("Organization not found with id: " + id);
        }
        Organization entity = organizationMapper.toEntity(id, dto);
        Organization saved = organizationRepository.save(entity);
        return organizationMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        if (!organizationRepository.existsById(id)) {
            throw new RuntimeException("Organization not found with id: " + id);
        }
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
