package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.BookingActivity;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface BookingActivityRepository extends JpaRepository<BookingActivity, UUID> {

    List<BookingActivity> findByTenantOrganization(UUID tenantOrganization);

    List<BookingActivity> findByBookingBookingId(UUID bookingId);

    List<BookingActivity> findByBookingBookingIdOrderByActivityDateAscFromTimeAsc(UUID bookingId);

    @Query("SELECT COALESCE(SUM(a.totalPrice), 0) FROM BookingActivity a WHERE a.booking.bookingId = :bookingId")
    BigDecimal sumTotalPriceByBookingId(UUID bookingId);
}
