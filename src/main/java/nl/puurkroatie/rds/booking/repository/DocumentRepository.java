package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findByTenantOrganization(UUID tenantOrganization);

    List<Document> findByBookingBookingId(UUID bookingId);
}
