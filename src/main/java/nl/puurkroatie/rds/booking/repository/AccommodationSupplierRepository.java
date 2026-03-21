package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.AccommodationSupplier;
import nl.puurkroatie.rds.booking.entity.AccommodationSupplierId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AccommodationSupplierRepository extends JpaRepository<AccommodationSupplier, AccommodationSupplierId> {

    List<AccommodationSupplier> findByAccommodationTenantOrganization(UUID tenantOrganization);
}
