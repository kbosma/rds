package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.BookingLine;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface BookingLineRepository extends JpaRepository<BookingLine, UUID> {

    List<BookingLine> findByTenantOrganization(UUID tenantOrganization);

    List<BookingLine> findByBookingBookingId(UUID bookingId);

    List<BookingLine> findByBookingBookingIdOrderByFromDateAsc(UUID bookingId);

    @Query("SELECT COALESCE(SUM(l.price), 0) FROM BookingLine l WHERE l.booking.bookingId = :bookingId")
    BigDecimal sumPriceByBookingId(UUID bookingId);

    /** De vertrekdatum: de vroegste begindatum van de verblijven. */
    @Query("SELECT MIN(l.fromDate) FROM BookingLine l WHERE l.booking.bookingId = :bookingId")
    LocalDate firstFromDateByBookingId(UUID bookingId);
}
