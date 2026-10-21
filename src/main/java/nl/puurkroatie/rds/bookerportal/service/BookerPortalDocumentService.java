package nl.puurkroatie.rds.bookerportal.service;

import jakarta.persistence.EntityNotFoundException;
import nl.puurkroatie.rds.booking.repository.DocumentRepository;
import nl.puurkroatie.rds.bookerportal.dto.PortalDocumentContentDto;
import nl.puurkroatie.rds.bookerportal.dto.PortalDocumentDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Documenten van de eigen boeking die de medewerker zichtbaar heeft gemaakt in het portaal. */
@Service
@Transactional(readOnly = true)
public class BookerPortalDocumentService {

    private final DocumentRepository documentRepository;

    public BookerPortalDocumentService(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    public List<PortalDocumentDto> findDocuments(UUID bookingId) {
        return documentRepository.findPortalSummariesByBookingId(bookingId).stream()
                .map(d -> new PortalDocumentDto(d.getDocumentId(), d.getDisplayname(), d.getMimeType(),
                        d.getSize() == null ? 0L : d.getSize(), d.getCreatedAt()))
                .toList();
    }

    /**
     * Het bestand zelf. Een document van een andere boeking, of een dat niet zichtbaar is in het portaal,
     * is hetzelfde als een document dat niet bestaat (404), zodat er niets over andermans documenten lekt.
     */
    public PortalDocumentContentDto findContent(UUID bookingId, UUID documentId) {
        return documentRepository.findById(documentId)
                .filter(d -> d.getBooking().getBookingId().equals(bookingId) && d.isVisibleInPortal())
                .map(d -> new PortalDocumentContentDto(d.getDisplayname(), d.getMimeType(), d.getDocument()))
                .orElseThrow(() -> new EntityNotFoundException("Document not found"));
    }
}
