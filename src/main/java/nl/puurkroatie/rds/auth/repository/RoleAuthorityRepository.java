package nl.puurkroatie.rds.auth.repository;

import nl.puurkroatie.rds.auth.entity.Role;
import nl.puurkroatie.rds.auth.entity.RoleAuthority;
import nl.puurkroatie.rds.auth.entity.RoleAuthorityId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RoleAuthorityRepository extends JpaRepository<RoleAuthority, RoleAuthorityId> {

    List<RoleAuthority> findByRole(Role role);

    List<RoleAuthority> findByRoleTenantOrganization(UUID tenantOrganization);
}
