package nl.puurkroatie.rds.mollie.repository;

import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MolliePaymentRepository extends JpaRepository<MolliePayment, UUID> {

    Optional<MolliePayment> findByMolliePaymentExternalId(String molliePaymentExternalId);

    List<MolliePayment> findByTenantOrganization(UUID tenantOrganization);
}
