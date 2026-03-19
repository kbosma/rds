package nl.puurkroatie.rds.repository;

import nl.puurkroatie.rds.entity.Role;
import nl.puurkroatie.rds.entity.RoleAuthority;
import nl.puurkroatie.rds.entity.RoleAuthorityId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoleAuthorityRepository extends JpaRepository<RoleAuthority, RoleAuthorityId> {

    List<RoleAuthority> findByRole(Role role);
}
