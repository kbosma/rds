package nl.puurkroatie.rds.email.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.email.dto.EmailTemplateDto;
import nl.puurkroatie.rds.email.entity.EmailTemplate;
import nl.puurkroatie.rds.email.mapper.EmailTemplateMapper;
import nl.puurkroatie.rds.email.repository.EmailImageRepository;
import nl.puurkroatie.rds.email.repository.EmailTemplateRepository;
import nl.puurkroatie.rds.email.service.InvalidImageReferenceException;
import nl.puurkroatie.rds.email.service.TemplateImages;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailTemplateServiceImplTest {

    private static final UUID ORG = UUID.fromString("a1000000-0000-0000-0000-000000000001");
    private static final UUID OWN_IMAGE = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID FOREIGN_IMAGE = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Mock
    private EmailTemplateRepository repository;
    @Mock
    private EmailTemplateMapper mapper;
    @Mock
    private EmailImageRepository imageRepository;

    private EmailTemplateServiceImpl service;

    @BeforeEach
    void setUp() {
        // de echte controle (TemplateImages) met een gemockte repository: we testen óók dat de service hem aanroept
        service = new EmailTemplateServiceImpl(repository, mapper, new TemplateImages(imageRepository));
    }

    @Captor
    private ArgumentCaptor<EmailTemplate> captor;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private EmailTemplateDto dto() {
        return new EmailTemplateDto(null, "Welkom", "desc", "Hallo ${prospect.firstname}",
                "<p>Hoi</p>", null, null, null, null, null);
    }

    @Test
    void create_persistsNameSubjectAndBody() {
        when(repository.save(any(EmailTemplate.class))).thenAnswer(inv -> inv.getArgument(0));
        when(mapper.toDto(any(EmailTemplate.class))).thenReturn(dto());

        service.create(dto());

        verify(repository).save(captor.capture());
        assertEquals("Welkom", captor.getValue().getName());
        assertEquals("Hallo ${prospect.firstname}", captor.getValue().getSubject());
        assertEquals("<p>Hoi</p>", captor.getValue().getBodyHtml());
    }

    @Test
    void findAll_nonAdmin_usesTenantQuery() {
        TenantContext.setOrganizationId(ORG);
        TenantContext.setRoles(Set.of("EMPLOYEE"));
        when(repository.findByTenantOrganization(ORG)).thenReturn(List.of());

        service.findAll();

        verify(repository).findByTenantOrganization(ORG);
    }

    @Test
    void findAll_admin_usesGlobalQuery() {
        TenantContext.setRoles(Set.of("ADMIN"));
        when(repository.findAll()).thenReturn(List.of());

        service.findAll();

        verify(repository).findAll();
    }

    // ----- afbeeldingen horen bij de eigen organisatie -----

    private EmailTemplateDto dtoWithBody(String bodyHtml) {
        return new EmailTemplateDto(null, "Welkom", "desc", "Onderwerp", bodyHtml, null, null, null, null, null);
    }

    private String img(UUID id) {
        return "<img src=\"/api/public/email-images/" + id + "\">";
    }

    @Test
    void create_withAnImageOfTheOwnOrganisation_isAllowed() {
        TenantContext.setOrganizationId(ORG);
        when(imageRepository.existsByEmailImageIdAndTenantOrganization(OWN_IMAGE, ORG)).thenReturn(true);
        when(repository.save(any(EmailTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        service.create(dtoWithBody("<p>Hoi</p>" + img(OWN_IMAGE)));

        verify(repository).save(any(EmailTemplate.class));
    }

    @Test
    void create_withAnImageOfAnotherOrganisation_isRefused_andNothingIsSaved() {
        TenantContext.setOrganizationId(ORG);
        // bestaat wel, maar niet bij ORG
        when(imageRepository.existsByEmailImageIdAndTenantOrganization(FOREIGN_IMAGE, ORG)).thenReturn(false);

        InvalidImageReferenceException ex = assertThrows(InvalidImageReferenceException.class,
                () -> service.create(dtoWithBody(img(FOREIGN_IMAGE))));

        assertTrue(ex.getMessage().contains(FOREIGN_IMAGE.toString()), ex.getMessage());
        verify(repository, never()).save(any(EmailTemplate.class));
    }

    @Test
    void theRefusalDoesNotRevealWhetherTheImageExistsElsewhere() {
        TenantContext.setOrganizationId(ORG);
        when(imageRepository.existsByEmailImageIdAndTenantOrganization(any(), any())).thenReturn(false);

        InvalidImageReferenceException foreign = assertThrows(InvalidImageReferenceException.class,
                () -> service.create(dtoWithBody(img(FOREIGN_IMAGE))));
        InvalidImageReferenceException unknown = assertThrows(InvalidImageReferenceException.class,
                () -> service.create(dtoWithBody(img(UUID.randomUUID()))));

        // zelfde melding (op het id na): "bestaat niet" en "is van een ander" zijn niet te onderscheiden
        assertEquals(foreign.getMessage().replace(FOREIGN_IMAGE.toString(), "ID"),
                unknown.getMessage().replaceAll("[0-9a-f-]{36}", "ID"));
    }

    @Test
    void create_aReferenceInTheFormOfAnAbsoluteUrl_isCheckedToo() {
        TenantContext.setOrganizationId(ORG);
        when(imageRepository.existsByEmailImageIdAndTenantOrganization(FOREIGN_IMAGE, ORG)).thenReturn(false);

        assertThrows(InvalidImageReferenceException.class, () -> service.create(dtoWithBody(
                "<img src=\"https://anders.example/api/public/email-images/" + FOREIGN_IMAGE + "\">")));
    }

    @Test
    void create_withoutImages_doesNotTouchTheImageRepository() {
        TenantContext.setOrganizationId(ORG);
        when(repository.save(any(EmailTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        service.create(dtoWithBody("<p>Alleen tekst</p>"));

        verifyNoInteractions(imageRepository);
    }

    @Test
    void update_withAnImageOfAnotherOrganisation_isRefused_andNothingIsSaved() {
        TenantContext.setOrganizationId(ORG);
        UUID templateId = UUID.randomUUID();
        when(repository.findById(templateId)).thenReturn(Optional.of(
                new EmailTemplate(templateId, "Welkom", null, "S", "<p>x</p>", null, null, ORG)));
        when(imageRepository.existsByEmailImageIdAndTenantOrganization(FOREIGN_IMAGE, ORG)).thenReturn(false);

        assertThrows(InvalidImageReferenceException.class,
                () -> service.update(templateId, dtoWithBody(img(FOREIGN_IMAGE))));

        verify(repository, never()).save(any(EmailTemplate.class));
    }
}
