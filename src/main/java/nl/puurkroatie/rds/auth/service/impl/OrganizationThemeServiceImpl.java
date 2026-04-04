package nl.puurkroatie.rds.auth.service.impl;

import nl.puurkroatie.rds.auth.dto.OrganizationThemeDto;
import nl.puurkroatie.rds.auth.entity.Organization;
import nl.puurkroatie.rds.auth.entity.OrganizationTheme;
import nl.puurkroatie.rds.auth.mapper.OrganizationThemeMapper;
import nl.puurkroatie.rds.auth.repository.OrganizationRepository;
import nl.puurkroatie.rds.auth.repository.OrganizationThemeRepository;
import nl.puurkroatie.rds.auth.service.OrganizationThemeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class OrganizationThemeServiceImpl implements OrganizationThemeService {

    private final OrganizationThemeRepository organizationThemeRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationThemeMapper organizationThemeMapper;

    public OrganizationThemeServiceImpl(OrganizationThemeRepository organizationThemeRepository,
                                        OrganizationRepository organizationRepository,
                                        OrganizationThemeMapper organizationThemeMapper) {
        this.organizationThemeRepository = organizationThemeRepository;
        this.organizationRepository = organizationRepository;
        this.organizationThemeMapper = organizationThemeMapper;
    }

    @Override
    public OrganizationThemeDto create(OrganizationThemeDto dto) {
        Organization organization = organizationRepository.findById(dto.getOrganizationId())
                .orElseThrow(() -> new RuntimeException("Organization not found with id: " + dto.getOrganizationId()));
        OrganizationTheme entity = new OrganizationTheme(organization, dto.getPrimaryColor(), dto.getAccentColor(), dto.getLogoUrl());
        OrganizationTheme saved = organizationThemeRepository.save(entity);
        return organizationThemeMapper.toDto(saved);
    }

    @Override
    public OrganizationThemeDto update(UUID id, OrganizationThemeDto dto) {
        if (!organizationThemeRepository.existsById(id)) {
            throw new RuntimeException("OrganizationTheme not found with id: " + id);
        }
        Organization organization = organizationRepository.findById(dto.getOrganizationId())
                .orElseThrow(() -> new RuntimeException("Organization not found with id: " + dto.getOrganizationId()));
        OrganizationTheme entity = organizationThemeMapper.toEntity(id, dto, organization);
        OrganizationTheme saved = organizationThemeRepository.save(entity);
        return organizationThemeMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        if (!organizationThemeRepository.existsById(id)) {
            throw new RuntimeException("OrganizationTheme not found with id: " + id);
        }
        organizationThemeRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrganizationThemeDto> findAll() {
        return organizationThemeRepository.findAll().stream()
                .map(organizationThemeMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OrganizationThemeDto> findById(UUID id) {
        return organizationThemeRepository.findById(id)
                .map(organizationThemeMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OrganizationThemeDto> findByOrganizationId(UUID organizationId) {
        return organizationThemeRepository.findByOrganization_OrganizationId(organizationId)
                .map(organizationThemeMapper::toDto);
    }
}
