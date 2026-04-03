package nl.puurkroatie.rds.mollie.repository;

import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatusEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MolliePaymentStatusEntryRepository extends JpaRepository<MolliePaymentStatusEntry, UUID> {

    List<MolliePaymentStatusEntry> findByMolliePaymentMolliePaymentId(UUID molliePaymentId);

    List<MolliePaymentStatusEntry> findByMolliePaymentMolliePaymentIdIn(List<UUID> molliePaymentIds);
}
