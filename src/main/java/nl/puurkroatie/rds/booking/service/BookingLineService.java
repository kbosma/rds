package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.BookingLineDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingLineService {

    List<BookingLineDto> findAll();

    List<BookingLineDto> findByBookingId(UUID bookingId);

    Optional<BookingLineDto> findById(UUID bookingLineId);

    BookingLineDto create(BookingLineDto dto);

    BookingLineDto update(UUID bookingLineId, BookingLineDto dto);

    void delete(UUID bookingLineId);
}
