package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findByTenantOrganization(UUID tenantOrganization);

    List<Document> findByBookingBookingId(UUID bookingId);

    /** De documenten van een boeking die in het boekerportaal zichtbaar zijn, nieuwste eerst, zonder de bytes. */
    @Query("""
            select d.documentId as documentId, d.displayname as displayname, d.mimeType as mimeType,
                   cast(sql('octet_length(?)', d.document) as long) as size, d.createdAt as createdAt
            from Document d
            where d.booking.bookingId = :bookingId and d.visibleInPortal = true
            order by d.createdAt desc
            """)
    List<DocumentSummary> findPortalSummariesByBookingId(@Param("bookingId") UUID bookingId);
}
