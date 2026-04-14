package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.BookingLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BookingLineRepository extends JpaRepository<BookingLine, UUID> {

    List<BookingLine> findByTenantOrganization(UUID tenantOrganization);

    List<BookingLine> findByBookingBookingId(UUID bookingId);
}
