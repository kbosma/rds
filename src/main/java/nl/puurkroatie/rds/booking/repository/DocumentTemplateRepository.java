package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.DocumentTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentTemplateRepository extends JpaRepository<DocumentTemplate, UUID> {

    List<DocumentTemplate> findByTenantOrganization(UUID tenantOrganization);

    /**
     * Of een template uit de editor van deze organisatie de tekst (bv. het publieke pad van een
     * afbeelding) in zijn bron-HTML heeft. Alleen de eigen organisatie: een template mag geen
     * afbeelding van een andere organisatie bevatten (afgedwongen bij het opslaan).
     */
    boolean existsByTenantOrganizationAndSourceHtmlContaining(UUID tenantOrganization, String fragment);
}
