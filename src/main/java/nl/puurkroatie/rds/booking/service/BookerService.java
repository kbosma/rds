package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.BookerDto;
import nl.puurkroatie.rds.booking.entity.BookerStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookerService {

    BookerDto create(BookerDto dto);

    BookerDto update(UUID id, BookerDto dto);

    void delete(UUID id);

    List<BookerDto> findAll(BookerStatus status);

    Optional<BookerDto> findById(UUID id);
}
