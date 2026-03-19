package nl.puurkroatie.rds.repository;

import nl.puurkroatie.rds.entity.RoleAuthority;
import nl.puurkroatie.rds.entity.RoleAuthorityId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleAuthorityRepository extends JpaRepository<RoleAuthority, RoleAuthorityId> {
}
