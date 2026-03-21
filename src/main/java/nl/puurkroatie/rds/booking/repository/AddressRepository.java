package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AddressRepository extends JpaRepository<Address, UUID> {

    List<Address> findByTenantOrganization(UUID tenantOrganization);
}
