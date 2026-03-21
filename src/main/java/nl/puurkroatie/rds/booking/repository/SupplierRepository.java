package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SupplierRepository extends JpaRepository<Supplier, UUID> {

    List<Supplier> findByTenantOrganization(UUID tenantOrganization);
}
