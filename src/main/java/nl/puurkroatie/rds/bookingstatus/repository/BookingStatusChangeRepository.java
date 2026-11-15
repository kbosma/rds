package nl.puurkroatie.rds.bookingstatus.repository;

import nl.puurkroatie.rds.bookingstatus.entity.BookingStatusChange;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BookingStatusChangeRepository extends JpaRepository<BookingStatusChange, UUID> {

    List<BookingStatusChange> findByBookingBookingIdOrderByCreatedAtDesc(UUID bookingId);
}
