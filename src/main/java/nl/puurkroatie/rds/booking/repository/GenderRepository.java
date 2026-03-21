package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.Gender;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GenderRepository extends JpaRepository<Gender, UUID> {
}
