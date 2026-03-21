package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.Traveler;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TravelerRepository extends JpaRepository<Traveler, UUID> {

    List<Traveler> findByTenantOrganization(UUID tenantOrganization);
}
