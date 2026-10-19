package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.BookingMolliePayment;
import nl.puurkroatie.rds.booking.entity.BookingMolliePaymentId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface BookingMolliePaymentRepository extends JpaRepository<BookingMolliePayment, BookingMolliePaymentId> {

    List<BookingMolliePayment> findByBookingTenantOrganization(UUID tenantOrganization);

    List<BookingMolliePayment> findByBookingBookingId(UUID bookingId);

    Optional<BookingMolliePayment> findByMolliePaymentMolliePaymentId(UUID molliePaymentId);

    /**
     * Verhuist de koppeling van een betaling naar een andere boeking. Alleen aanroepen vlak nadat de herkoppeling is
     * geregistreerd: een databasetrigger weigert deze wijziging anders (migratie V12). Native, omdat de boeking
     * onderdeel van de primaire sleutel is.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE booking_mollie_payment SET booking_id = :toBookingId "
            + "WHERE mollie_payment_id = :molliePaymentId AND booking_id = :fromBookingId", nativeQuery = true)
    int moveToBooking(@Param("molliePaymentId") UUID molliePaymentId,
                      @Param("fromBookingId") UUID fromBookingId,
                      @Param("toBookingId") UUID toBookingId);
}
