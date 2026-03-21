package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.booking.dto.BookingStatusDto;
import nl.puurkroatie.rds.booking.entity.BookingStatus;
import nl.puurkroatie.rds.booking.repository.BookingStatusRepository;
import nl.puurkroatie.rds.booking.service.BookingStatusService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class BookingStatusServiceImpl implements BookingStatusService {

    private final BookingStatusRepository bookingStatusRepository;

    public BookingStatusServiceImpl(BookingStatusRepository bookingStatusRepository) {
        this.bookingStatusRepository = bookingStatusRepository;
    }

    @Override
    public List<BookingStatusDto> findAll() {
        return bookingStatusRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<BookingStatusDto> findById(UUID id) {
        return bookingStatusRepository.findById(id)
                .map(this::toDto);
    }

    private BookingStatusDto toDto(BookingStatus entity) {
        return new BookingStatusDto(
                entity.getBookingstatusId(),
                entity.getDisplayname()
        );
    }
}
