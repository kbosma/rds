package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.BookingDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingService {

    BookingDto create(BookingDto dto);

    BookingDto update(UUID id, BookingDto dto);

    void delete(UUID id);

    List<BookingDto> findAll();

    Optional<BookingDto> findById(UUID id);
}
