package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.BookingStatusDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingStatusService {

    List<BookingStatusDto> findAll();

    Optional<BookingStatusDto> findById(UUID id);
}
