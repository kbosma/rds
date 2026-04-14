package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.DocumentTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentTemplateRepository extends JpaRepository<DocumentTemplate, UUID> {

    List<DocumentTemplate> findByTenantOrganization(UUID tenantOrganization);
}
