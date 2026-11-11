package nl.puurkroatie.rds.settings.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * De instellingen van de eigen organisatie. Bij bijwerken tellen alleen de keuzes; organisatie en audit-velden
 * bepaalt de server. Een lege templatekeuze ({@code null}) is toegestaan: dan kan de bijbehorende functie (bv.
 * offerte versturen) nog niet gebruikt worden, of gaat er (bij de betaalmail) geen mail.
 */
public record OrganizationSettingsDto(
        UUID organizationId,
        UUID quoteDocumentTemplateId,
        UUID quoteEmailTemplateId,
        @NotNull @Min(1) @Max(100) Integer depositPercentage,
        @NotNull @Min(1) @Max(104) Integer depositWeeksBeforeDeparture,
        @NotNull @Min(0) @Max(103) Integer balanceWeeksBeforeDeparture,
        UUID paymentEmailTemplateId,
        LocalDateTime modifiedAt,
        UUID modifiedBy) {
}
