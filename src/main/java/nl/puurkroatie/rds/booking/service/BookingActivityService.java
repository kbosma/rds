package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.BookingActivityDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingActivityService {

    List<BookingActivityDto> findAll();

    List<BookingActivityDto> findByBookingId(UUID bookingId);

    Optional<BookingActivityDto> findById(UUID bookingActivityId);

    BookingActivityDto create(BookingActivityDto dto);

    BookingActivityDto update(UUID bookingActivityId, BookingActivityDto dto);

    void delete(UUID bookingActivityId);
}
