package nl.puurkroatie.rds.auth.repository;

import nl.puurkroatie.rds.auth.entity.Authority;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuthorityRepository extends JpaRepository<Authority, UUID> {
}
