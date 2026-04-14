package nl.puurkroatie.rds.auth.service.impl;

import jakarta.persistence.EntityNotFoundException;
import nl.puurkroatie.rds.auth.dto.OrganizationThemeDto;
import nl.puurkroatie.rds.auth.entity.OrganizationTheme;
import nl.puurkroatie.rds.auth.mapper.OrganizationThemeMapper;
import nl.puurkroatie.rds.auth.repository.OrganizationRepository;
import nl.puurkroatie.rds.auth.repository.OrganizationThemeRepository;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.auth.service.OrganizationThemeService;
import org.springframework.security.access.AccessDeniedException;
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
        verifyOrganization(dto.getOrganizationId());
        var organization = organizationRepository.findById(dto.getOrganizationId())
                .orElseThrow(() -> new EntityNotFoundException("Organization not found with id: " + dto.getOrganizationId()));
        OrganizationTheme entity = new OrganizationTheme(organization, dto.getPrimaryColor(), dto.getAccentColor(), dto.getLogoUrl(), dto.getCardTitleColor());
        return organizationThemeMapper.toDto(organizationThemeRepository.save(entity));
    }

    @Override
    public OrganizationThemeDto update(UUID id, OrganizationThemeDto dto) {
        OrganizationTheme existing = organizationThemeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("OrganizationTheme not found with id: " + id));
        verifyOrganization(existing.getOrganization().getOrganizationId());
        OrganizationTheme entity = organizationThemeMapper.toEntity(id, dto, existing.getOrganization());
        return organizationThemeMapper.toDto(organizationThemeRepository.save(entity));
    }

    @Override
    public void delete(UUID id) {
        OrganizationTheme existing = organizationThemeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("OrganizationTheme not found with id: " + id));
        verifyOrganization(existing.getOrganization().getOrganizationId());
        organizationThemeRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrganizationThemeDto> findAll() {
        if (isAdmin()) {
            return organizationThemeRepository.findAll().stream()
                    .map(organizationThemeMapper::toDto)
                    .toList();
        }
        return organizationThemeRepository
                .findByOrganization_OrganizationId(TenantContext.getOrganizationId())
                .map(organizationThemeMapper::toDto)
                .map(List::of)
                .orElse(List.of());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OrganizationThemeDto> findById(UUID id) {
        return organizationThemeRepository.findById(id)
                .filter(t -> isAdmin() || t.getOrganization().getOrganizationId().equals(TenantContext.getOrganizationId()))
                .map(organizationThemeMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OrganizationThemeDto> findByOrganizationId(UUID organizationId) {
        return organizationThemeRepository.findByOrganization_OrganizationId(organizationId)
                .map(organizationThemeMapper::toDto);
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
