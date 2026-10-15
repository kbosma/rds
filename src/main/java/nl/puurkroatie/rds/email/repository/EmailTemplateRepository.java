package nl.puurkroatie.rds.email.repository;

import nl.puurkroatie.rds.email.entity.EmailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, UUID> {

    List<EmailTemplate> findByTenantOrganization(UUID tenantOrganization);

    /**
     * Of een template van DEZE organisatie een stuk tekst in de body heeft. Per organisatie: een
     * template mag alleen afbeeldingen van de eigen organisatie bevatten (zie
     * EmailTemplateServiceImpl), dus een andere organisatie kan een afbeelding niet in gebruik
     * houden.
     */
    boolean existsByTenantOrganizationAndBodyHtmlContaining(UUID tenantOrganization, String fragment);
}
