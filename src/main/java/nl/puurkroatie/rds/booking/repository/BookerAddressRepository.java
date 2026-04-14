package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.BookerAddress;
import nl.puurkroatie.rds.booking.entity.BookerAddressId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BookerAddressRepository extends JpaRepository<BookerAddress, BookerAddressId> {

    List<BookerAddress> findByBookerTenantOrganization(UUID tenantOrganization);

    List<BookerAddress> findByBookerBookerId(UUID bookerId);
}
