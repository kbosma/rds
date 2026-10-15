package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.DocumentTemplateDto;
import nl.puurkroatie.rds.booking.entity.DocumentTemplate;
import nl.puurkroatie.rds.booking.mapper.DocumentTemplateMapper;
import nl.puurkroatie.rds.booking.repository.DocumentTemplateRepository;
import nl.puurkroatie.rds.booking.service.DocumentTemplateService;
import nl.puurkroatie.rds.docgen.service.HtmlToDocxConverter;
import nl.puurkroatie.rds.email.service.TemplateImages;
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
    private final HtmlToDocxConverter htmlToDocxConverter;
    private final TemplateImages templateImages;

    public DocumentTemplateServiceImpl(DocumentTemplateRepository documentTemplateRepository,
                                       DocumentTemplateMapper documentTemplateMapper,
                                       HtmlToDocxConverter htmlToDocxConverter,
                                       TemplateImages templateImages) {
        this.documentTemplateRepository = documentTemplateRepository;
        this.documentTemplateMapper = documentTemplateMapper;
        this.htmlToDocxConverter = htmlToDocxConverter;
        this.templateImages = templateImages;
    }

    @Override
    public DocumentTemplateDto create(DocumentTemplateDto dto) {
        DocumentTemplate entity = toEntity(dto, TenantContext.getOrganizationId());
        DocumentTemplate saved = documentTemplateRepository.save(entity);
        return documentTemplateMapper.toDto(saved);
    }

    @Override
    public DocumentTemplateDto update(UUID id, DocumentTemplateDto dto) {
        DocumentTemplate existing = documentTemplateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("DocumentTemplate not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        DocumentTemplate entity = toEntity(id, dto, existing);
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

    private DocumentTemplate toEntity(DocumentTemplateDto dto, UUID organizationId) {
        if (dto.getSourceHtml() != null) {
            return new DocumentTemplate(dto.getName(), dto.getDescription(),
                    buildDocx(dto.getSourceHtml(), organizationId), dto.getSourceHtml());
        }
        return new DocumentTemplate(dto.getName(), dto.getDescription(), dto.getTemplateData());
    }

    private DocumentTemplate toEntity(UUID id, DocumentTemplateDto dto, DocumentTemplate existing) {
        // Drie gevallen bij een update:
        //  - bron-HTML meegestuurd (editor): het .docx wordt opnieuw opgebouwd, de HTML bewaard;
        //  - nieuw bestand meegestuurd (upload): dat wordt de template, een eventuele bron-HTML vervalt
        //    (anders zou de editor een oudere versie tonen dan er in gebruik is);
        //  - geen van beide (alleen naam/omschrijving): bytes én bron-HTML blijven staan.
        byte[] templateData;
        String sourceHtml;
        if (dto.getSourceHtml() != null) {
            sourceHtml = dto.getSourceHtml();
            templateData = buildDocx(sourceHtml, existing.getTenantOrganization());
        } else if (dto.getTemplateData() != null) {
            sourceHtml = null;
            templateData = dto.getTemplateData();
        } else {
            sourceHtml = existing.getSourceHtml();
            templateData = existing.getTemplateData();
        }
        return new DocumentTemplate(
                id,
                dto.getName(),
                dto.getDescription(),
                templateData,
                sourceHtml,
                existing.getCreatedAt(),
                existing.getCreatedBy(),
                existing.getTenantOrganization()
        );
    }

    /** Controleert de afbeeldingen (alleen eigen organisatie) en maakt er een .docx van. */
    private byte[] buildDocx(String sourceHtml, UUID organizationId) {
        templateImages.verifyBelongTo(organizationId, sourceHtml);
        return htmlToDocxConverter.convert(sourceHtml, templateImages.lookupFor(organizationId));
    }
}
