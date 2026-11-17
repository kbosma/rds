package nl.puurkroatie.rds.auth.repository;

import nl.puurkroatie.rds.auth.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {

    List<Role> findByTenantOrganizationOrderByDescription(UUID tenantOrganization);

    Optional<Role> findByTenantOrganizationAndSystemKey(UUID tenantOrganization, String systemKey);

    boolean existsByTenantOrganizationAndDescriptionIgnoreCase(UUID tenantOrganization, String description);
}
