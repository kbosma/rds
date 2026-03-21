package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BookingStatusRepository extends JpaRepository<BookingStatus, UUID> {
}
