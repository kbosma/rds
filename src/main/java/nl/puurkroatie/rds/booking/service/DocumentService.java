package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.DocumentDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentService {

    DocumentDto create(DocumentDto dto);

    /** Wijzigt alleen de zichtbaarheid in het boekerportaal; al het andere aan een document staat vast. */
    DocumentDto changePortalVisibility(UUID id, boolean visibleInPortal);

    List<DocumentDto> findAll();

    Optional<DocumentDto> findById(UUID id);

    List<DocumentDto> findByBookingId(UUID bookingId);
}
