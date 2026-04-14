package nl.puurkroatie.rds.docgen.service;

import nl.puurkroatie.rds.booking.dto.DocumentDto;

import java.util.UUID;

public interface DocumentGenerationService {

    DocumentDto generate(UUID templateId, UUID bookingId, String outputFormat);
}
