package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.BookerStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookerRepository extends JpaRepository<Booker, UUID> {

    List<Booker> findByTenantOrganization(UUID tenantOrganization);

    List<Booker> findByStatus(BookerStatus status);

    List<Booker> findByTenantOrganizationAndStatus(UUID tenantOrganization, BookerStatus status);

    Optional<Booker> findByEmailaddress(String emailaddress);
}
