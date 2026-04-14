package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.DocumentTemplateDto;
import nl.puurkroatie.rds.booking.entity.DocumentTemplate;
import nl.puurkroatie.rds.booking.mapper.DocumentTemplateMapper;
import nl.puurkroatie.rds.booking.repository.DocumentTemplateRepository;
import nl.puurkroatie.rds.booking.service.DocumentTemplateService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class DocumentTemplateServiceImpl implements DocumentTemplateService {

    private final DocumentTemplateRepository documentTemplateRepository;
    private final DocumentTemplateMapper documentTemplateMapper;

    public DocumentTemplateServiceImpl(DocumentTemplateRepository documentTemplateRepository, DocumentTemplateMapper documentTemplateMapper) {
        this.documentTemplateRepository = documentTemplateRepository;
        this.documentTemplateMapper = documentTemplateMapper;
    }

    @Override
    public DocumentTemplateDto create(DocumentTemplateDto dto) {
        DocumentTemplate entity = toEntity(dto);
        DocumentTemplate saved = documentTemplateRepository.save(entity);
        return documentTemplateMapper.toDto(saved);
    }

    @Override
    public DocumentTemplateDto update(UUID id, DocumentTemplateDto dto) {
        DocumentTemplate existing = documentTemplateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("DocumentTemplate not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        DocumentTemplate entity = toEntity(id, dto);
        DocumentTemplate saved = documentTemplateRepository.save(entity);
        return documentTemplateMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        DocumentTemplate existing = documentTemplateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("DocumentTemplate not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        documentTemplateRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentTemplateDto> findAll() {
        if (isAdmin()) {
            return documentTemplateRepository.findAll().stream()
                    .map(documentTemplateMapper::toDto)
                    .toList();
        }
        return documentTemplateRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(documentTemplateMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<DocumentTemplateDto> findById(UUID id) {
        return documentTemplateRepository.findById(id)
                .filter(entity -> isAdmin() || entity.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(documentTemplateMapper::toDto);
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }

    private DocumentTemplate toEntity(DocumentTemplateDto dto) {
        return new DocumentTemplate(
                dto.getName(),
                dto.getDescription(),
                dto.getTemplateData()
        );
    }

    private DocumentTemplate toEntity(UUID id, DocumentTemplateDto dto) {
        return new DocumentTemplate(
                id,
                dto.getName(),
                dto.getDescription(),
                dto.getTemplateData()
        );
    }
}
