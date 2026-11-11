package nl.puurkroatie.rds.settings.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.entity.DocumentTemplate;
import nl.puurkroatie.rds.booking.repository.DocumentTemplateRepository;
import nl.puurkroatie.rds.email.entity.EmailTemplate;
import nl.puurkroatie.rds.email.repository.EmailTemplateRepository;
import nl.puurkroatie.rds.settings.dto.OrganizationSettingsDto;
import nl.puurkroatie.rds.settings.mapper.OrganizationSettingsMapper;
import nl.puurkroatie.rds.settings.repository.OrganizationSettingsRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Een organisatie kan alleen haar eigen templates kiezen; een template van een ander geeft dezelfde 400 als een onbekende. */
@ExtendWith(MockitoExtension.class)
class OrganizationSettingsServiceImplTest {

    private static final UUID OWN_ORG = UUID.fromString("a1000000-0000-0000-0000-000000000002");
    private static final UUID OTHER_ORG = UUID.fromString("a1000000-0000-0000-0000-000000000001");
    private static final UUID TEMPLATE_ID = UUID.fromString("99999999-0000-0000-0000-000000000001");

    @Mock
    private OrganizationSettingsRepository settingsRepository;
    @Mock
    private DocumentTemplateRepository documentTemplateRepository;
    @Mock
    private EmailTemplateRepository emailTemplateRepository;
    @Mock
    private OrganizationSettingsMapper mapper;
    @InjectMocks
    private OrganizationSettingsServiceImpl service;

    private MockedStatic<TenantContext> tenant;

    @BeforeEach
    void ownOrganization() {
        tenant = Mockito.mockStatic(TenantContext.class);
        tenant.when(TenantContext::getOrganizationId).thenReturn(OWN_ORG);
    }

    @AfterEach
    void close() {
        tenant.close();
    }

    @Test
    void choosingADocumentTemplateOfAnotherOrganization_isRejected() {
        DocumentTemplate foreign = mock(DocumentTemplate.class);
        when(foreign.getTenantOrganization()).thenReturn(OTHER_ORG);
        when(documentTemplateRepository.findById(TEMPLATE_ID)).thenReturn(Optional.of(foreign));

        assertThrows(IllegalArgumentException.class,
                () -> service.updateMine(new OrganizationSettingsDto(null, TEMPLATE_ID, null, null, null)));
        verify(settingsRepository, never()).save(any());
    }

    @Test
    void choosingAnEmailTemplateOfAnotherOrganization_isRejected() {
        EmailTemplate foreign = mock(EmailTemplate.class);
        when(foreign.getTenantOrganization()).thenReturn(OTHER_ORG);
        when(emailTemplateRepository.findById(TEMPLATE_ID)).thenReturn(Optional.of(foreign));

        assertThrows(IllegalArgumentException.class,
                () -> service.updateMine(new OrganizationSettingsDto(null, null, TEMPLATE_ID, null, null)));
        verify(settingsRepository, never()).save(any());
    }
}
