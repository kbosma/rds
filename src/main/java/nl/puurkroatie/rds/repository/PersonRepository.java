package nl.puurkroatie.rds.repository;

import nl.puurkroatie.rds.entity.Person;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PersonRepository extends JpaRepository<Person, UUID> {

    List<Person> findByOrganizationOrganizationId(UUID organizationId);
}
