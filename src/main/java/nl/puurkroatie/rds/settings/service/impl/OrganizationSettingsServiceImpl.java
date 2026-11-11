package nl.puurkroatie.rds.settings.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.repository.DocumentTemplateRepository;
import nl.puurkroatie.rds.email.repository.EmailTemplateRepository;
import nl.puurkroatie.rds.settings.dto.OrganizationSettingsDto;
import nl.puurkroatie.rds.settings.entity.OrganizationSettings;
import nl.puurkroatie.rds.settings.mapper.OrganizationSettingsMapper;
import nl.puurkroatie.rds.settings.repository.OrganizationSettingsRepository;
import nl.puurkroatie.rds.settings.service.OrganizationSettingsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class OrganizationSettingsServiceImpl implements OrganizationSettingsService {

    private final OrganizationSettingsRepository settingsRepository;
    private final DocumentTemplateRepository documentTemplateRepository;
    private final EmailTemplateRepository emailTemplateRepository;
    private final OrganizationSettingsMapper mapper;

    public OrganizationSettingsServiceImpl(OrganizationSettingsRepository settingsRepository,
                                           DocumentTemplateRepository documentTemplateRepository,
                                           EmailTemplateRepository emailTemplateRepository,
                                           OrganizationSettingsMapper mapper) {
        this.settingsRepository = settingsRepository;
        this.documentTemplateRepository = documentTemplateRepository;
        this.emailTemplateRepository = emailTemplateRepository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public OrganizationSettingsDto findMine() {
        return mapper.toDto(forOrganization(ownOrganization()));
    }

    @Override
    public OrganizationSettingsDto updateMine(OrganizationSettingsDto dto) {
        UUID organizationId = ownOrganization();
        verifyDocumentTemplate(dto.quoteDocumentTemplateId(), organizationId);
        verifyEmailTemplate(dto.quoteEmailTemplateId(), organizationId);
        verifyEmailTemplate(dto.paymentEmailTemplateId(), organizationId);
        if (dto.depositWeeksBeforeDeparture() <= dto.balanceWeeksBeforeDeparture()) {
            throw new IllegalArgumentException(
                    "Het voorschot moet eerder vervallen dan het restant: kies meer weken voor vertrek bij het voorschot");
        }

        OrganizationSettings choices = new OrganizationSettings(organizationId, dto.quoteDocumentTemplateId(),
                dto.quoteEmailTemplateId(), dto.depositPercentage(), dto.depositWeeksBeforeDeparture(),
                dto.balanceWeeksBeforeDeparture(), dto.paymentEmailTemplateId());
        OrganizationSettings settings = settingsRepository.findByOrganizationId(organizationId)
                .map(existing -> existing.withChoicesOf(choices))
                .orElse(choices);
        return mapper.toDto(settingsRepository.save(settings));
    }

    @Override
    @Transactional(readOnly = true)
    public OrganizationSettings forOrganization(UUID organizationId) {
        return settingsRepository.findByOrganizationId(organizationId)
                .orElseGet(() -> OrganizationSettings.defaults(organizationId));
    }

    /** Instellingen horen altijd bij de organisatie van de ingelogde gebruiker (ook een ADMIN heeft er één). */
    private UUID ownOrganization() {
        UUID organizationId = TenantContext.getOrganizationId();
        if (organizationId == null) {
            throw new IllegalStateException("Geen organisatie bekend voor de ingelogde gebruiker");
        }
        return organizationId;
    }

    // Eén melding voor "bestaat niet" en "is van een ander", zodat er niets over andermans templates lekt.
    private void verifyDocumentTemplate(UUID templateId, UUID organizationId) {
        if (templateId != null && documentTemplateRepository.findById(templateId)
                .filter(t -> organizationId.equals(t.getTenantOrganization())).isEmpty()) {
            throw new IllegalArgumentException("Onbekende documenttemplate: " + templateId);
        }
    }

    private void verifyEmailTemplate(UUID templateId, UUID organizationId) {
        if (templateId != null && emailTemplateRepository.findById(templateId)
                .filter(t -> organizationId.equals(t.getTenantOrganization())).isEmpty()) {
            throw new IllegalArgumentException("Onbekende e-mailtemplate: " + templateId);
        }
    }
}
