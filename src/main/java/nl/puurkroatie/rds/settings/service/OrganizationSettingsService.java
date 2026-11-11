package nl.puurkroatie.rds.settings.service;

import nl.puurkroatie.rds.settings.dto.OrganizationSettingsDto;
import nl.puurkroatie.rds.settings.entity.OrganizationSettings;

import java.util.UUID;

public interface OrganizationSettingsService {

    /** De instellingen van de eigen organisatie; zonder opgeslagen instellingen zijn alle keuzes leeg. */
    OrganizationSettingsDto findMine();

    /** Slaat de keuzes van de eigen organisatie op. Gekozen templates moeten van de eigen organisatie zijn. */
    OrganizationSettingsDto updateMine(OrganizationSettingsDto dto);

    /** Voor andere services: de instellingen van een organisatie, of lege instellingen als er nog niets is opgeslagen. */
    OrganizationSettings forOrganization(UUID organizationId);
}
