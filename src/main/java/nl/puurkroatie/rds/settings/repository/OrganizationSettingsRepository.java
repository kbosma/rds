package nl.puurkroatie.rds.settings.repository;

import nl.puurkroatie.rds.settings.entity.OrganizationSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrganizationSettingsRepository extends JpaRepository<OrganizationSettings, UUID> {

    Optional<OrganizationSettings> findByOrganizationId(UUID organizationId);
}
