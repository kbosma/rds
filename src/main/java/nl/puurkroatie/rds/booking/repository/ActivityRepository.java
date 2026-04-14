package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.Activity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ActivityRepository extends JpaRepository<Activity, UUID> {

    List<Activity> findByTenantOrganization(UUID tenantOrganization);
}
