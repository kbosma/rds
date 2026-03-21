package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.AccommodationAddress;
import nl.puurkroatie.rds.booking.entity.AccommodationAddressId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AccommodationAddressRepository extends JpaRepository<AccommodationAddress, AccommodationAddressId> {

    List<AccommodationAddress> findByAccommodationTenantOrganization(UUID tenantOrganization);
}
