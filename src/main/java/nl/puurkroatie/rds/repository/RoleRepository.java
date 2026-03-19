package nl.puurkroatie.rds.repository;

import nl.puurkroatie.rds.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {
}
