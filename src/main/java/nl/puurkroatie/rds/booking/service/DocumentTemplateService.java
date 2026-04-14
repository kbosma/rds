package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.DocumentTemplateDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentTemplateService {

    DocumentTemplateDto create(DocumentTemplateDto dto);

    DocumentTemplateDto update(UUID id, DocumentTemplateDto dto);

    void delete(UUID id);

    List<DocumentTemplateDto> findAll();

    Optional<DocumentTemplateDto> findById(UUID id);
}
