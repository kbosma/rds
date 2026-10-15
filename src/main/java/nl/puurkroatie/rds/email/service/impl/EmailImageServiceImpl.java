package nl.puurkroatie.rds.email.service.impl;

import jakarta.persistence.EntityNotFoundException;
import nl.puurkroatie.rds.booking.repository.DocumentTemplateRepository;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.email.dto.EmailImageContentDto;
import nl.puurkroatie.rds.email.dto.EmailImageDto;
import nl.puurkroatie.rds.email.dto.EmailImageListItemDto;
import nl.puurkroatie.rds.email.entity.EmailImage;
import nl.puurkroatie.rds.email.mapper.EmailImageMapper;
import nl.puurkroatie.rds.email.repository.EmailImageRepository;
import nl.puurkroatie.rds.email.repository.EmailImageSummary;
import nl.puurkroatie.rds.email.repository.EmailTemplateRepository;
import nl.puurkroatie.rds.email.service.EmailImageInUseException;
import nl.puurkroatie.rds.email.service.EmailImageUrlResolver;
import nl.puurkroatie.rds.email.service.EmailImageService;
import nl.puurkroatie.rds.email.service.ImageTypes;
import nl.puurkroatie.rds.email.service.InvalidImageException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class EmailImageServiceImpl implements EmailImageService {

    private static final int MAX_FILENAME_LENGTH = 255;

    private final EmailImageRepository emailImageRepository;
    private final EmailImageMapper emailImageMapper;
    private final EmailTemplateRepository emailTemplateRepository;
    private final DocumentTemplateRepository documentTemplateRepository;
    private final long maxBytes;

    public EmailImageServiceImpl(EmailImageRepository emailImageRepository,
                                 EmailImageMapper emailImageMapper,
                                 EmailTemplateRepository emailTemplateRepository,
                                 DocumentTemplateRepository documentTemplateRepository,
                                 @Value("${app.email.image.max-bytes:2097152}") long maxBytes) {
        this.emailImageRepository = emailImageRepository;
        this.emailImageMapper = emailImageMapper;
        this.emailTemplateRepository = emailTemplateRepository;
        this.documentTemplateRepository = documentTemplateRepository;
        this.maxBytes = maxBytes;
    }

    @Override
    public EmailImageDto upload(String originalFilename, byte[] data) {
        if (data == null || data.length == 0) {
            throw new InvalidImageException("The uploaded image is empty.");
        }
        if (data.length > maxBytes) {
            throw new InvalidImageException("The image is too large (maximum " + describeSize(maxBytes) + ").");
        }
        // Het type komt uit de bytes zelf, niet uit wat de client opgeeft.
        String contentType = ImageTypes.detect(data).orElseThrow(() ->
                new InvalidImageException("Unsupported image type. Allowed types: " + ImageTypes.ALLOWED_DESCRIPTION + "."));

        EmailImage saved = emailImageRepository.save(
                new EmailImage(sanitizeFilename(originalFilename), contentType, data));
        return emailImageMapper.toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<EmailImageContentDto> findContent(UUID id) {
        return emailImageRepository.findById(id)
                .map(image -> new EmailImageContentDto(image.getContentType(), image.getData()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmailImageListItemDto> findAll() {
        List<EmailImageSummary> rows = TenantContext.hasRole("ADMIN")
                ? emailImageRepository.findAllByOrderByCreatedAtDesc()
                : emailImageRepository.findByTenantOrganizationOrderByCreatedAtDesc(TenantContext.getOrganizationId());
        return rows.stream()
                .map(row -> new EmailImageListItemDto(
                        row.getEmailImageId(),
                        EmailImageUrlResolver.publicPath(row.getEmailImageId()),
                        row.getOriginalFilename(),
                        row.getContentType(),
                        row.getSizeBytes(),
                        row.getCreatedAt(),
                        isUsedInTemplate(row.getEmailImageId(), row.getTenantOrganization())))
                .toList();
    }

    @Override
    public void delete(UUID id) {
        EmailImage image = emailImageRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("EmailImage not found with id: " + id));
        if (!TenantContext.hasRole("ADMIN") && !image.getTenantOrganization().equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
        if (isUsedInTemplate(id, image.getTenantOrganization())) {
            throw new EmailImageInUseException();
        }
        emailImageRepository.delete(image);
    }

    /**
     * Gebruikt in een e-mailtemplate of in een Word-template uit de editor (die zijn afbeelding in de
     * bron-HTML heeft staan; het .docx zelf bevat een eigen kopie). Alleen templates van de organisatie
     * van de afbeelding: een template mag geen afbeelding van een andere organisatie bevatten (wordt bij
     * het opslaan afgedwongen), dus een andere organisatie kan het verwijderen niet blokkeren en leert
     * er niets van.
     */
    private boolean isUsedInTemplate(UUID id, UUID tenantOrganization) {
        String path = EmailImageUrlResolver.publicPath(id);
        return emailTemplateRepository.existsByTenantOrganizationAndBodyHtmlContaining(tenantOrganization, path)
                || documentTemplateRepository.existsByTenantOrganizationAndSourceHtmlContaining(tenantOrganization, path);
    }

    /** Alleen de bestandsnaam (geen pad), zonder stuurtekens, begrensd in lengte; informatief. */
    private String sanitizeFilename(String filename) {
        if (filename == null) {
            return null;
        }
        String name = filename.substring(Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\')) + 1)
                .replaceAll("\\p{Cntrl}", "")
                .trim();
        if (name.isEmpty()) {
            return null;
        }
        return name.length() > MAX_FILENAME_LENGTH ? name.substring(0, MAX_FILENAME_LENGTH) : name;
    }

    private String describeSize(long bytes) {
        long mb = 1024L * 1024L;
        return bytes % mb == 0 ? (bytes / mb) + " MB" : (bytes / 1024) + " KB";
    }
}
