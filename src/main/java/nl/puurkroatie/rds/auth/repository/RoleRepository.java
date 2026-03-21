package nl.puurkroatie.rds.auth.repository;

import nl.puurkroatie.rds.auth.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {
}
