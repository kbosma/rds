package nl.puurkroatie.rds.auth.repository;

import nl.puurkroatie.rds.auth.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {
}
