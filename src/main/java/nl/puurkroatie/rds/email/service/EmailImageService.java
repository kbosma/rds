package nl.puurkroatie.rds.email.service;

import nl.puurkroatie.rds.email.dto.EmailImageContentDto;
import nl.puurkroatie.rds.email.dto.EmailImageDto;
import nl.puurkroatie.rds.email.dto.EmailImageListItemDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmailImageService {

    /**
     * Valideert en bewaart een afbeelding voor gebruik in een e-mailtemplate.
     *
     * @throws InvalidImageException als de afbeelding leeg, te groot of geen ondersteund type is
     */
    EmailImageDto upload(String originalFilename, byte[] data);

    /**
     * Haalt de bytes en het Content-Type op voor publieke uitlevering. Bewust
     * zonder tenant-filter: de afbeelding moet voor een ontvanger zonder login
     * bereikbaar zijn; de UUID is de (onraadbare) sleutel.
     */
    Optional<EmailImageContentDto> findContent(UUID id);

    /**
     * De bibliotheek: afbeeldingen van de eigen organisatie, nieuwste eerst, zonder bytes.
     * ADMIN ziet alle organisaties.
     */
    List<EmailImageListItemDto> findAll();

    /**
     * Verwijdert een afbeelding. Alleen toegestaan als geen template van de eigen organisatie hem gebruikt.
     *
     * Let op: verstuurde mails bevatten een link naar de afbeelding; die kunnen we niet
     * controleren. Na verwijderen is het plaatje in zulke mails weg.
     *
     * @throws EmailImageInUseException als een template de afbeelding nog gebruikt
     */
    void delete(UUID id);
}
