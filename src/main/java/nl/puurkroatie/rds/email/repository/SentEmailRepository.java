package nl.puurkroatie.rds.email.repository;

import nl.puurkroatie.rds.email.entity.SentEmail;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SentEmailRepository extends JpaRepository<SentEmail, UUID> {

    List<SentEmail> findByBookingBookingIdOrderByCreatedAtDesc(UUID bookingId);
}
