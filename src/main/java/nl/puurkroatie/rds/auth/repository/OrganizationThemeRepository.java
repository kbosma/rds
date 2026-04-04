package nl.puurkroatie.rds.auth.repository;

import nl.puurkroatie.rds.auth.entity.OrganizationTheme;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrganizationThemeRepository extends JpaRepository<OrganizationTheme, UUID> {

    Optional<OrganizationTheme> findByOrganization_OrganizationId(UUID organizationId);
}
