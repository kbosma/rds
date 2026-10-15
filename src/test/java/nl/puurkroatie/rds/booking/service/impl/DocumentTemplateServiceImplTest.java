package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.DocumentTemplateDto;
import nl.puurkroatie.rds.booking.entity.DocumentTemplate;
import nl.puurkroatie.rds.booking.mapper.DocumentTemplateMapper;
import nl.puurkroatie.rds.booking.repository.DocumentTemplateRepository;
import nl.puurkroatie.rds.docgen.service.HtmlToDocxConverter;
import nl.puurkroatie.rds.email.service.InvalidImageReferenceException;
import nl.puurkroatie.rds.email.service.TemplateImages;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Een DOCX-template kan geüpload worden (bytes) of in de editor gemaakt worden (HTML). Bij de editor wordt
 * het .docx bij het opslaan gebouwd en de HTML bewaard; bij een upload vervalt de HTML.
 */
@ExtendWith(MockitoExtension.class)
class DocumentTemplateServiceImplTest {

    private static final UUID ORG = UUID.fromString("a1000000-0000-0000-0000-000000000001");
    private static final UUID OTHER_ORG = UUID.fromString("a2000000-0000-0000-0000-000000000002");
    private static final UUID TEMPLATE_ID = UUID.randomUUID();
    private static final byte[] UPLOADED = {1, 2, 3};
    private static final byte[] BUILT = {9, 9, 9};
    private static final byte[] OLD = {7, 7};
    private static final String HTML = "<p>Boeking ${booking.bookingNumber}</p>";

    @Mock
    private DocumentTemplateRepository repository;
    @Mock
    private DocumentTemplateMapper mapper;
    @Mock
    private HtmlToDocxConverter converter;
    @Mock
    private TemplateImages templateImages;
    @Mock
    private HtmlToDocxConverter.ImageLookup lookup;

    private DocumentTemplateServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new DocumentTemplateServiceImpl(repository, mapper, converter, templateImages);
        TenantContext.setOrganizationId(ORG);
        TenantContext.setRoles(Set.of("MANAGER"));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private DocumentTemplateDto dto(byte[] data, String sourceHtml) {
        return new DocumentTemplateDto(null, "Offerte", "omschrijving", data, sourceHtml, null, null, null, null);
    }

    private DocumentTemplate existing(UUID organization, String sourceHtml) {
        return new DocumentTemplate(TEMPLATE_ID, "Oud", "oud", OLD, sourceHtml,
                LocalDateTime.of(2026, 1, 1, 12, 0), UUID.randomUUID(), organization);
    }

    private DocumentTemplate saved() {
        ArgumentCaptor<DocumentTemplate> captor = ArgumentCaptor.forClass(DocumentTemplate.class);
        verify(repository).save(captor.capture());
        return captor.getValue();
    }

    // ----- aanmaken -----

    @Test
    void create_withAnUploadedFile_storesTheBytes_withoutSourceHtml() {
        when(repository.save(any(DocumentTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        service.create(dto(UPLOADED, null));

        DocumentTemplate entity = saved();
        assertArrayEquals(UPLOADED, entity.getTemplateData());
        assertNull(entity.getSourceHtml());
        verifyNoInteractions(converter, templateImages);
    }

    @Test
    void create_withSourceHtml_buildsTheDocxAndKeepsTheHtml() {
        when(templateImages.lookupFor(ORG)).thenReturn(lookup);
        when(converter.convert(HTML, lookup)).thenReturn(BUILT);
        when(repository.save(any(DocumentTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        service.create(dto(null, HTML));

        DocumentTemplate entity = saved();
        assertArrayEquals(BUILT, entity.getTemplateData());
        assertEquals(HTML, entity.getSourceHtml());
        verify(templateImages).verifyBelongTo(ORG, HTML);
    }

    @Test
    void create_withSourceHtml_ignoresBytesThatAreSentAlong() {
        when(templateImages.lookupFor(ORG)).thenReturn(lookup);
        when(converter.convert(HTML, lookup)).thenReturn(BUILT);
        when(repository.save(any(DocumentTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        service.create(dto(UPLOADED, HTML));

        assertArrayEquals(BUILT, saved().getTemplateData());
    }

    @Test
    void create_withAnEmptyEditorDocument_isAllowed() {
        when(templateImages.lookupFor(ORG)).thenReturn(lookup);
        when(converter.convert("", lookup)).thenReturn(BUILT);
        when(repository.save(any(DocumentTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        service.create(dto(null, ""));

        assertEquals("", saved().getSourceHtml());
    }

    @Test
    void create_withAnImageOfAnotherOrganisation_isRefused_andNothingIsBuiltOrSaved() {
        doThrow(new InvalidImageReferenceException("nope")).when(templateImages).verifyBelongTo(ORG, HTML);

        assertThrows(InvalidImageReferenceException.class, () -> service.create(dto(null, HTML)));

        verify(converter, never()).convert(anyString(), any());
        verify(repository, never()).save(any(DocumentTemplate.class));
    }

    // ----- bijwerken -----

    @Test
    void update_nameOnly_keepsTheBytesAndTheSourceHtml() {
        when(repository.findById(TEMPLATE_ID)).thenReturn(Optional.of(existing(ORG, "<p>oud</p>")));
        when(repository.save(any(DocumentTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        service.update(TEMPLATE_ID, dto(null, null));

        DocumentTemplate entity = saved();
        assertEquals("Offerte", entity.getName());
        assertArrayEquals(OLD, entity.getTemplateData());
        assertEquals("<p>oud</p>", entity.getSourceHtml());
        verifyNoInteractions(converter);
    }

    @Test
    void update_withANewUpload_replacesTheBytes_andDropsTheStaleSourceHtml() {
        when(repository.findById(TEMPLATE_ID)).thenReturn(Optional.of(existing(ORG, "<p>oud</p>")));
        when(repository.save(any(DocumentTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        service.update(TEMPLATE_ID, dto(UPLOADED, null));

        DocumentTemplate entity = saved();
        assertArrayEquals(UPLOADED, entity.getTemplateData());
        assertNull(entity.getSourceHtml(), "de editor zou anders een oudere versie tonen dan er in gebruik is");
    }

    @Test
    void update_withSourceHtml_rebuildsTheDocx() {
        when(repository.findById(TEMPLATE_ID)).thenReturn(Optional.of(existing(ORG, null)));
        when(templateImages.lookupFor(ORG)).thenReturn(lookup);
        when(converter.convert(HTML, lookup)).thenReturn(BUILT);
        when(repository.save(any(DocumentTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        service.update(TEMPLATE_ID, dto(null, HTML));

        DocumentTemplate entity = saved();
        assertArrayEquals(BUILT, entity.getTemplateData());
        assertEquals(HTML, entity.getSourceHtml());
    }

    @Test
    void update_keepsTenantAndAudit() {
        DocumentTemplate current = existing(ORG, null);
        when(repository.findById(TEMPLATE_ID)).thenReturn(Optional.of(current));
        when(repository.save(any(DocumentTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        service.update(TEMPLATE_ID, dto(null, null));

        DocumentTemplate entity = saved();
        assertEquals(ORG, entity.getTenantOrganization());
        assertEquals(current.getCreatedAt(), entity.getCreatedAt());
        assertEquals(current.getCreatedBy(), entity.getCreatedBy());
        assertEquals(TEMPLATE_ID, entity.getDocumentTemplateId());
    }

    @Test
    void update_checksTheImagesAgainstTheOrganisationOfTheTemplate() {
        TenantContext.setRoles(Set.of("ADMIN")); // beheerder: de organisatie is die van de template, niet de eigen
        when(repository.findById(TEMPLATE_ID)).thenReturn(Optional.of(existing(OTHER_ORG, null)));
        when(templateImages.lookupFor(OTHER_ORG)).thenReturn(lookup);
        when(converter.convert(HTML, lookup)).thenReturn(BUILT);
        when(repository.save(any(DocumentTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        service.update(TEMPLATE_ID, dto(null, HTML));

        verify(templateImages).verifyBelongTo(OTHER_ORG, HTML);
    }

    @Test
    void update_withAnImageOfAnotherOrganisation_isRefused_andNothingIsSaved() {
        when(repository.findById(TEMPLATE_ID)).thenReturn(Optional.of(existing(ORG, null)));
        doThrow(new InvalidImageReferenceException("nope")).when(templateImages).verifyBelongTo(ORG, HTML);

        assertThrows(InvalidImageReferenceException.class, () -> service.update(TEMPLATE_ID, dto(null, HTML)));

        verify(repository, never()).save(any(DocumentTemplate.class));
    }

    @Test
    void update_ofATemplateOfAnotherOrganisation_isDenied() {
        when(repository.findById(TEMPLATE_ID)).thenReturn(Optional.of(existing(OTHER_ORG, null)));

        assertThrows(AccessDeniedException.class, () -> service.update(TEMPLATE_ID, dto(null, HTML)));

        verifyNoInteractions(converter, templateImages);
        verify(repository, never()).save(any(DocumentTemplate.class));
    }
}
