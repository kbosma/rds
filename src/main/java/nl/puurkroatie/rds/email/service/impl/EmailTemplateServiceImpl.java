package nl.puurkroatie.rds.email.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.email.dto.EmailTemplateDto;
import nl.puurkroatie.rds.email.entity.EmailTemplate;
import nl.puurkroatie.rds.email.mapper.EmailTemplateMapper;
import nl.puurkroatie.rds.email.repository.EmailTemplateRepository;
import nl.puurkroatie.rds.email.service.TemplateImages;
import nl.puurkroatie.rds.email.service.EmailTemplateService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class EmailTemplateServiceImpl implements EmailTemplateService {

    private final EmailTemplateRepository emailTemplateRepository;
    private final EmailTemplateMapper emailTemplateMapper;
    private final TemplateImages templateImages;

    public EmailTemplateServiceImpl(EmailTemplateRepository emailTemplateRepository,
                                    EmailTemplateMapper emailTemplateMapper,
                                    TemplateImages templateImages) {
        this.emailTemplateRepository = emailTemplateRepository;
        this.emailTemplateMapper = emailTemplateMapper;
        this.templateImages = templateImages;
    }

    @Override
    public EmailTemplateDto create(EmailTemplateDto dto) {
        templateImages.verifyBelongTo(TenantContext.getOrganizationId(), dto.getBodyHtml());
        EmailTemplate saved = emailTemplateRepository.save(toEntity(dto));
        return emailTemplateMapper.toDto(saved);
    }

    @Override
    public EmailTemplateDto update(UUID id, EmailTemplateDto dto) {
        EmailTemplate existing = emailTemplateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("EmailTemplate not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        templateImages.verifyBelongTo(existing.getTenantOrganization(), dto.getBodyHtml());
        EmailTemplate saved = emailTemplateRepository.save(toEntity(id, dto, existing));
        return emailTemplateMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        EmailTemplate existing = emailTemplateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("EmailTemplate not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        emailTemplateRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmailTemplateDto> findAll() {
        if (isAdmin()) {
            return emailTemplateRepository.findAll().stream()
                    .map(emailTemplateMapper::toDto)
                    .toList();
        }
        return emailTemplateRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(emailTemplateMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<EmailTemplateDto> findById(UUID id) {
        return emailTemplateRepository.findById(id)
                .filter(entity -> isAdmin() || entity.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(emailTemplateMapper::toDto);
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }

    private EmailTemplate toEntity(EmailTemplateDto dto) {
        return new EmailTemplate(dto.getName(), dto.getDescription(), dto.getSubject(), dto.getBodyHtml());
    }

    private EmailTemplate toEntity(UUID id, EmailTemplateDto dto, EmailTemplate existing) {
        // Behoud tenant + audit van de bestaande entity (zie update-constructor).
        return new EmailTemplate(
                id,
                dto.getName(),
                dto.getDescription(),
                dto.getSubject(),
                dto.getBodyHtml(),
                existing.getCreatedAt(),
                existing.getCreatedBy(),
                existing.getTenantOrganization()
        );
    }
}
