package nl.puurkroatie.rds.email.service.impl;

import jakarta.persistence.EntityNotFoundException;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.email.dto.EmailImageContentDto;
import nl.puurkroatie.rds.email.dto.EmailImageDto;
import nl.puurkroatie.rds.email.dto.EmailImageListItemDto;
import nl.puurkroatie.rds.email.entity.EmailImage;
import nl.puurkroatie.rds.email.mapper.EmailImageMapper;
import nl.puurkroatie.rds.email.repository.EmailImageRepository;
import nl.puurkroatie.rds.email.repository.EmailImageSummary;
import nl.puurkroatie.rds.email.repository.EmailTemplateRepository;
import nl.puurkroatie.rds.booking.repository.DocumentTemplateRepository;
import nl.puurkroatie.rds.email.service.EmailImageInUseException;
import nl.puurkroatie.rds.email.service.ImageTypes;
import nl.puurkroatie.rds.email.service.InvalidImageException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.security.access.AccessDeniedException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Validatie bij het uploaden: leeg, te groot en niet-ondersteund worden geweigerd, het
 * type komt uit de bytes, en de bestandsnaam wordt opgeschoond. Geen database nodig.
 */
@ExtendWith(MockitoExtension.class)
class EmailImageServiceImplTest {

    private static final long MAX_BYTES = 1024;
    private static final UUID IMAGE_ID = UUID.fromString("11111111-2222-3333-4444-555555555555");
    private static final UUID OTHER_IMAGE_ID = UUID.fromString("66666666-7777-8888-9999-000000000000");
    private static final UUID ORG = UUID.fromString("a1000000-0000-0000-0000-000000000001");
    private static final UUID OTHER_ORG = UUID.fromString("a1000000-0000-0000-0000-000000000002");

    /** Minimale geldige PNG-header. */
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3};

    @Mock
    private EmailImageRepository repository;
    @Mock
    private EmailImageMapper mapper;
    @Mock
    private EmailTemplateRepository templateRepository;
    @Mock
    private DocumentTemplateRepository documentTemplateRepository;

    private EmailImageServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new EmailImageServiceImpl(repository, mapper, templateRepository, documentTemplateRepository, MAX_BYTES);
        TenantContext.setOrganizationId(ORG);
        TenantContext.setRoles(Set.of("MANAGER"));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private ArgumentCaptor<EmailImage> stubSave() {
        ArgumentCaptor<EmailImage> captor = ArgumentCaptor.forClass(EmailImage.class);
        when(repository.save(captor.capture())).thenAnswer(inv -> {
            EmailImage in = inv.getArgument(0);
            return new EmailImage(IMAGE_ID, in.getOriginalFilename(), in.getContentType(), in.getData());
        });
        when(mapper.toDto(any(EmailImage.class))).thenAnswer(inv -> {
            EmailImage e = inv.getArgument(0);
            return new EmailImageDto(e.getEmailImageId(), "/api/public/email-images/" + e.getEmailImageId(),
                    e.getOriginalFilename(), e.getContentType(), e.getSizeBytes());
        });
        return captor;
    }

    @Test
    void upload_valid_storesDetectedTypeAndReturnsUrl() {
        ArgumentCaptor<EmailImage> saved = stubSave();

        EmailImageDto result = service.upload("logo.png", PNG);

        assertEquals(ImageTypes.PNG, saved.getValue().getContentType());
        assertEquals(PNG.length, saved.getValue().getSizeBytes());
        assertArrayEquals(PNG, saved.getValue().getData());
        assertEquals("/api/public/email-images/" + IMAGE_ID, result.getUrl());
    }

    @Test
    void upload_nameSaysPngButBytesAreHtml_isRejected() {
        // Een lege/valse extensie of Content-Type mag niets afdwingen: de bytes beslissen.
        byte[] html = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.UTF_8);

        InvalidImageException ex = assertThrows(InvalidImageException.class, () -> service.upload("evil.png", html));

        assertTrue(ex.getMessage().contains("Unsupported image type"), ex.getMessage());
        assertTrue(ex.getMessage().contains("PNG, JPEG, GIF, WebP"), ex.getMessage());
        verify(repository, never()).save(any());
    }

    @Test
    void upload_svg_isRejected() {
        byte[] svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"/>".getBytes(StandardCharsets.UTF_8);

        assertThrows(InvalidImageException.class, () -> service.upload("a.svg", svg));
        verify(repository, never()).save(any());
    }

    @Test
    void upload_empty_isRejected() {
        assertThrows(InvalidImageException.class, () -> service.upload("a.png", new byte[0]));
        assertThrows(InvalidImageException.class, () -> service.upload("a.png", null));
        verify(repository, never()).save(any());
    }

    @Test
    void upload_tooLarge_isRejectedWithTheLimit() {
        byte[] big = new byte[(int) MAX_BYTES + 1];
        System.arraycopy(PNG, 0, big, 0, PNG.length);

        InvalidImageException ex = assertThrows(InvalidImageException.class, () -> service.upload("big.png", big));

        assertTrue(ex.getMessage().contains("too large"), ex.getMessage());
        assertTrue(ex.getMessage().contains("1 KB"), ex.getMessage());
        verify(repository, never()).save(any());
    }

    @Test
    void upload_exactlyAtTheLimit_isAccepted() {
        stubSave();
        byte[] atLimit = new byte[(int) MAX_BYTES];
        System.arraycopy(PNG, 0, atLimit, 0, PNG.length);

        service.upload("ok.png", atLimit);

        verify(repository).save(any());
    }

    @Test
    void upload_filenameIsReducedToABareName() {
        ArgumentCaptor<EmailImage> saved = stubSave();

        service.upload("C:\\Users\\jan\\..\\logo.png", PNG);
        assertEquals("logo.png", saved.getValue().getOriginalFilename());

        service.upload("../../etc/passwd", PNG);
        assertEquals("passwd", saved.getValue().getOriginalFilename());
    }

    @Test
    void upload_controlCharactersAndBlankNames_areHandled() {
        ArgumentCaptor<EmailImage> saved = stubSave();

        service.upload("lo\r\ngo.png", PNG);
        assertEquals("logo.png", saved.getValue().getOriginalFilename());

        service.upload("   ", PNG);
        assertNull(saved.getValue().getOriginalFilename());

        service.upload(null, PNG);
        assertNull(saved.getValue().getOriginalFilename());
    }

    @Test
    void upload_veryLongFilename_isTruncated() {
        ArgumentCaptor<EmailImage> saved = stubSave();

        service.upload("a".repeat(500) + ".png", PNG);

        assertEquals(255, saved.getValue().getOriginalFilename().length());
    }

    @Test
    void findContent_returnsBytesAndStoredType() {
        when(repository.findById(IMAGE_ID))
                .thenReturn(Optional.of(new EmailImage(IMAGE_ID, "logo.png", ImageTypes.PNG, PNG)));

        Optional<EmailImageContentDto> content = service.findContent(IMAGE_ID);

        assertTrue(content.isPresent());
        assertEquals(ImageTypes.PNG, content.get().getContentType());
        assertArrayEquals(PNG, content.get().getData());
    }

    @Test
    void findContent_unknownId_isEmpty() {
        when(repository.findById(IMAGE_ID)).thenReturn(Optional.empty());

        assertTrue(service.findContent(IMAGE_ID).isEmpty());
    }

    // ----- bibliotheek: lijst -----

    private static EmailImageSummary summary(UUID id, String filename) {
        return summary(id, filename, ORG);
    }

    private static EmailImageSummary summary(UUID id, String filename, UUID tenant) {
        return new EmailImageSummary() {
            public UUID getTenantOrganization() { return tenant; }
            public UUID getEmailImageId() { return id; }
            public String getOriginalFilename() { return filename; }
            public String getContentType() { return ImageTypes.PNG; }
            public long getSizeBytes() { return 11; }
            public LocalDateTime getCreatedAt() { return LocalDateTime.of(2026, 10, 13, 12, 0); }
        };
    }

    @Test
    void findAll_returnsOwnOrganisationWithUrlAndUsageFlag() {
        when(repository.findByTenantOrganizationOrderByCreatedAtDesc(ORG))
                .thenReturn(List.of(summary(IMAGE_ID, "logo.png"), summary(OTHER_IMAGE_ID, "foto.png")));
        when(templateRepository.existsByTenantOrganizationAndBodyHtmlContaining(ORG, "/api/public/email-images/" + IMAGE_ID)).thenReturn(true);
        when(templateRepository.existsByTenantOrganizationAndBodyHtmlContaining(ORG, "/api/public/email-images/" + OTHER_IMAGE_ID)).thenReturn(false);

        List<EmailImageListItemDto> result = service.findAll();

        assertEquals(2, result.size());
        assertEquals("/api/public/email-images/" + IMAGE_ID, result.get(0).getUrl());
        assertEquals("logo.png", result.get(0).getOriginalFilename());
        assertTrue(result.get(0).isInUse());
        assertFalse(result.get(1).isInUse());
        verify(repository, never()).findAllByOrderByCreatedAtDesc();
    }

    @Test
    void findAll_asAdmin_seesAllOrganisations() {
        TenantContext.setRoles(Set.of("ADMIN"));
        when(repository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(summary(IMAGE_ID, "logo.png")));
        when(templateRepository.existsByTenantOrganizationAndBodyHtmlContaining(any(), anyString())).thenReturn(false);

        assertEquals(1, service.findAll().size());
        verify(repository, never()).findByTenantOrganizationOrderByCreatedAtDesc(any());
    }

    // ----- bibliotheek: verwijderen -----

    private EmailImage imageOf(UUID tenantOrg) {
        // tenant komt normaal uit @PrePersist; hier via een subklasse-loze truc: reflectie op het veld.
        EmailImage image = new EmailImage(IMAGE_ID, "logo.png", ImageTypes.PNG, PNG);
        try {
            var field = EmailImage.class.getDeclaredField("tenantOrganization");
            field.setAccessible(true);
            field.set(image, tenantOrg);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
        return image;
    }

    @Test
    void delete_unusedOwnImage_isDeleted() {
        EmailImage image = imageOf(ORG);
        when(repository.findById(IMAGE_ID)).thenReturn(Optional.of(image));
        when(templateRepository.existsByTenantOrganizationAndBodyHtmlContaining(ORG, "/api/public/email-images/" + IMAGE_ID)).thenReturn(false);

        service.delete(IMAGE_ID);

        verify(repository).delete(image);
    }

    @Test
    void delete_imageUsedInATemplate_isRefusedAndNotDeleted() {
        when(repository.findById(IMAGE_ID)).thenReturn(Optional.of(imageOf(ORG)));
        when(templateRepository.existsByTenantOrganizationAndBodyHtmlContaining(ORG, "/api/public/email-images/" + IMAGE_ID)).thenReturn(true);

        assertThrows(EmailImageInUseException.class, () -> service.delete(IMAGE_ID));

        verify(repository, never()).delete(any(EmailImage.class));
    }

    @Test
    void delete_imageUsedOnlyInAWordTemplate_isRefusedAndNotDeleted() {
        // Een Word-template uit de editor bewaart zijn bron-HTML; opnieuw opslaan zou stuk gaan zonder de afbeelding.
        when(repository.findById(IMAGE_ID)).thenReturn(Optional.of(imageOf(ORG)));
        when(templateRepository.existsByTenantOrganizationAndBodyHtmlContaining(ORG, "/api/public/email-images/" + IMAGE_ID)).thenReturn(false);
        when(documentTemplateRepository.existsByTenantOrganizationAndSourceHtmlContaining(ORG, "/api/public/email-images/" + IMAGE_ID)).thenReturn(true);

        assertThrows(EmailImageInUseException.class, () -> service.delete(IMAGE_ID));

        verify(repository, never()).delete(any(EmailImage.class));
    }

    @Test
    void findAll_flagsAnImageThatIsOnlyUsedInAWordTemplate() {
        when(repository.findByTenantOrganizationOrderByCreatedAtDesc(ORG))
                .thenReturn(List.of(summary(IMAGE_ID, "logo.png")));
        when(templateRepository.existsByTenantOrganizationAndBodyHtmlContaining(ORG, "/api/public/email-images/" + IMAGE_ID)).thenReturn(false);
        when(documentTemplateRepository.existsByTenantOrganizationAndSourceHtmlContaining(ORG, "/api/public/email-images/" + IMAGE_ID)).thenReturn(true);

        assertTrue(service.findAll().get(0).isInUse());
    }

    @Test
    void usage_isCheckedOnlyWithinTheOrganisationOfTheImage_forWordTemplatesToo() {
        when(repository.findById(IMAGE_ID)).thenReturn(Optional.of(imageOf(ORG)));
        when(templateRepository.existsByTenantOrganizationAndBodyHtmlContaining(any(), anyString())).thenReturn(false);
        when(documentTemplateRepository.existsByTenantOrganizationAndSourceHtmlContaining(any(), anyString())).thenReturn(false);

        service.delete(IMAGE_ID);

        verify(documentTemplateRepository).existsByTenantOrganizationAndSourceHtmlContaining(ORG, "/api/public/email-images/" + IMAGE_ID);
        verify(documentTemplateRepository, never()).existsByTenantOrganizationAndSourceHtmlContaining(OTHER_ORG, "/api/public/email-images/" + IMAGE_ID);
    }

    @Test
    void delete_imageOfAnotherOrganisation_isForbiddenAndNotDeleted() {
        when(repository.findById(IMAGE_ID)).thenReturn(Optional.of(imageOf(OTHER_ORG)));

        assertThrows(AccessDeniedException.class, () -> service.delete(IMAGE_ID));

        verify(repository, never()).delete(any(EmailImage.class));
        // en we hoeven niet eens te kijken of hij gebruikt wordt
        verify(templateRepository, never()).existsByTenantOrganizationAndBodyHtmlContaining(any(), anyString());
    }

    @Test
    void delete_unknownImage_isNotFound() {
        when(repository.findById(IMAGE_ID)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> service.delete(IMAGE_ID));
    }

    @Test
    void findAll_asAdmin_checksUsageWithinEachImagesOwnOrganisation() {
        TenantContext.setRoles(Set.of("ADMIN"));
        when(repository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(
                summary(IMAGE_ID, "van-a.png", ORG), summary(OTHER_IMAGE_ID, "van-b.png", OTHER_ORG)));
        when(templateRepository.existsByTenantOrganizationAndBodyHtmlContaining(any(), anyString())).thenReturn(false);

        service.findAll();

        // elke afbeelding wordt gecontroleerd in DE EIGEN organisatie, nooit daarbuiten
        verify(templateRepository).existsByTenantOrganizationAndBodyHtmlContaining(ORG, "/api/public/email-images/" + IMAGE_ID);
        verify(templateRepository).existsByTenantOrganizationAndBodyHtmlContaining(OTHER_ORG, "/api/public/email-images/" + OTHER_IMAGE_ID);
    }

    @Test
    void delete_isNotBlockedByAnotherOrganisationsTemplate() {
        // Een template van een ANDERE organisatie noemt de afbeelding (kan niet meer via de API, maar
        // bestaande/verkeerde data of directe database-toegang kan het wel opleveren). Dat mag het
        // verwijderen door de eigenaar niet blokkeren, en de eigenaar leert er niets van.
        EmailImage image = imageOf(ORG);
        when(repository.findById(IMAGE_ID)).thenReturn(Optional.of(image));
        when(templateRepository.existsByTenantOrganizationAndBodyHtmlContaining(ORG, "/api/public/email-images/" + IMAGE_ID))
                .thenReturn(false);

        service.delete(IMAGE_ID);

        verify(repository).delete(image);
        verify(templateRepository, never()).existsByTenantOrganizationAndBodyHtmlContaining(OTHER_ORG, "/api/public/email-images/" + IMAGE_ID);
    }
}
