package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.DocumentDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentService {

    DocumentDto create(DocumentDto dto);

    DocumentDto update(UUID id, DocumentDto dto);

    void delete(UUID id);

    List<DocumentDto> findAll();

    Optional<DocumentDto> findById(UUID id);
}
