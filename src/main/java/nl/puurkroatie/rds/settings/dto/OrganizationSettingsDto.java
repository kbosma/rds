package nl.puurkroatie.rds.settings.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * De instellingen van de eigen organisatie. Bij bijwerken tellen alleen de keuzes; organisatie en audit-velden
 * bepaalt de server. Een lege keuze ({@code null}) is toegestaan: dan kan de bijbehorende functie (bv. offerte
 * versturen) nog niet gebruikt worden.
 */
public record OrganizationSettingsDto(
        UUID organizationId,
        UUID quoteDocumentTemplateId,
        UUID quoteEmailTemplateId,
        LocalDateTime modifiedAt,
        UUID modifiedBy) {
}
