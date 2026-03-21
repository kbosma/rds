package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.Booker;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BookerRepository extends JpaRepository<Booker, UUID> {

    List<Booker> findByTenantOrganization(UUID tenantOrganization);
}
