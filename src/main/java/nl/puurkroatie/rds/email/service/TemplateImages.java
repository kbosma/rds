package nl.puurkroatie.rds.email.service;

import nl.puurkroatie.rds.docgen.service.HtmlToDocxConverter;
import nl.puurkroatie.rds.email.repository.EmailImageRepository;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Wat een template (e-mail of .docx) met afbeeldingen uit de bibliotheek mag. Beide soorten templates
 * gebruiken dezelfde bibliotheek en dezelfde regels, dus deze controle staat op één plek.
 *
 * Afbeeldingen worden niet tussen organisaties gedeeld: een template mag alleen afbeeldingen van de
 * EIGEN organisatie bevatten. De afbeelding-URL van een e-mail is publiek (een ontvanger heeft geen
 * login), dus zonder deze controle zou iemand die een UUID kent de afbeelding van een andere organisatie
 * kunnen insluiten, en zou die organisatie hem niet meer kunnen verwijderen.
 */
@Component
public class TemplateImages {

    private final EmailImageRepository emailImageRepository;

    public TemplateImages(EmailImageRepository emailImageRepository) {
        this.emailImageRepository = emailImageRepository;
    }

    /**
     * Elke verwijzing in de HTML telt (ook een absolute URL of een geplakt pad). De melding maakt geen
     * onderscheid tussen "bestaat niet" en "is van een ander", zodat er niets over andermans
     * afbeeldingen lekt.
     */
    public void verifyBelongTo(UUID organizationId, String html) {
        for (UUID imageId : EmailImageUrlResolver.imageIdsIn(html)) {
            if (!emailImageRepository.existsByEmailImageIdAndTenantOrganization(imageId, organizationId)) {
                throw new InvalidImageReferenceException(
                        "The template refers to an image that does not exist or is not available to your organization: "
                                + imageId);
            }
        }
    }

    /** Zoekt afbeeldingen voor het opbouwen van een document, uitsluitend uit de bibliotheek van deze organisatie. */
    public HtmlToDocxConverter.ImageLookup lookupFor(UUID organizationId) {
        return imageId -> emailImageRepository.findByEmailImageIdAndTenantOrganization(imageId, organizationId)
                .map(image -> new HtmlToDocxConverter.Image(image.getData(), image.getContentType()));
    }
}
