package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.BookingActivity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BookingActivityRepository extends JpaRepository<BookingActivity, UUID> {

    List<BookingActivity> findByTenantOrganization(UUID tenantOrganization);

    List<BookingActivity> findByBookingBookingId(UUID bookingId);
}
