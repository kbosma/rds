package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    List<Booking> findByTenantOrganization(UUID tenantOrganization);

    Optional<Booking> findByBookingNumberAndBookerEmailaddress(String bookingNumber, String emailaddress);

    boolean existsByBookingNumber(String bookingNumber);

    @Query("SELECT b FROM Booking b " +
           "LEFT JOIN FETCH b.booker " +
           "LEFT JOIN FETCH b.travelers " +
           "WHERE b.bookingId = :bookingId")
    Optional<Booking> findByIdWithBookerAndTravelers(@Param("bookingId") UUID bookingId);

    @Query("SELECT b FROM Booking b " +
           "LEFT JOIN FETCH b.bookingLines bl " +
           "LEFT JOIN FETCH bl.accommodation " +
           "LEFT JOIN FETCH bl.supplier " +
           "WHERE b.bookingId = :bookingId")
    Optional<Booking> findByIdWithBookingLines(@Param("bookingId") UUID bookingId);

    @Query("SELECT b FROM Booking b " +
           "LEFT JOIN FETCH b.bookingActivities ba " +
           "LEFT JOIN FETCH ba.activity " +
           "WHERE b.bookingId = :bookingId")
    Optional<Booking> findByIdWithBookingActivities(@Param("bookingId") UUID bookingId);
}
