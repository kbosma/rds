package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.BookingLineDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingLineService {

    List<BookingLineDto> findAll();

    List<BookingLineDto> findByBookingId(UUID bookingId);

    Optional<BookingLineDto> findById(UUID bookingId, UUID accommodationId, UUID supplierId);

    BookingLineDto create(BookingLineDto dto);

    BookingLineDto update(UUID bookingId, UUID accommodationId, UUID supplierId, BookingLineDto dto);

    void delete(UUID bookingId, UUID accommodationId, UUID supplierId);
}
