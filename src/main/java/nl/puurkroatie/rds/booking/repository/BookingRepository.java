package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    List<Booking> findByTenantOrganization(UUID tenantOrganization);
}
