package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    List<Booking> findByTenantOrganization(UUID tenantOrganization);

    Optional<Booking> findByBookingNumberAndBookerEmailaddress(String bookingNumber, String emailaddress);

    boolean existsByBookingNumber(String bookingNumber);
}
