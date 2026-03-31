package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.BookingMolliePaymentDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingMolliePaymentService {

    List<BookingMolliePaymentDto> findAll();

    Optional<BookingMolliePaymentDto> findById(UUID bookingId, UUID molliePaymentId);

    BookingMolliePaymentDto create(BookingMolliePaymentDto dto);

    List<BookingMolliePaymentDto> findByBookingId(UUID bookingId);

    void delete(UUID bookingId, UUID molliePaymentId);
}
