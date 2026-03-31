package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.BookingMolliePayment;
import nl.puurkroatie.rds.booking.entity.BookingMolliePaymentId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BookingMolliePaymentRepository extends JpaRepository<BookingMolliePayment, BookingMolliePaymentId> {

    List<BookingMolliePayment> findByBookingTenantOrganization(UUID tenantOrganization);

    List<BookingMolliePayment> findByBookingBookingId(UUID bookingId);
}
