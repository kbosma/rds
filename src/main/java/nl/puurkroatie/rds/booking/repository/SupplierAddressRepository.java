package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.SupplierAddress;
import nl.puurkroatie.rds.booking.entity.SupplierAddressId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SupplierAddressRepository extends JpaRepository<SupplierAddress, SupplierAddressId> {

    List<SupplierAddress> findBySupplierTenantOrganization(UUID tenantOrganization);

    List<SupplierAddress> findBySupplierSupplierIdIn(List<UUID> supplierIds);
}
