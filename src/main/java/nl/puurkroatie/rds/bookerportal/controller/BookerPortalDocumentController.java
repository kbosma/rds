package nl.puurkroatie.rds.bookerportal.controller;

import nl.puurkroatie.rds.bookerportal.security.BookerContext;
import nl.puurkroatie.rds.booking.dto.DocumentDto;
import nl.puurkroatie.rds.booking.mapper.DocumentMapper;
import nl.puurkroatie.rds.booking.repository.DocumentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/booker-portal/documents")
public class BookerPortalDocumentController {

    private final DocumentRepository documentRepository;
    private final DocumentMapper documentMapper;

    public BookerPortalDocumentController(DocumentRepository documentRepository, DocumentMapper documentMapper) {
        this.documentRepository = documentRepository;
        this.documentMapper = documentMapper;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKER_PORTAL_READ')")
    public ResponseEntity<List<DocumentDto>> findAll() {
        UUID bookingId = BookerContext.getBookingId();
        List<DocumentDto> documents = documentRepository.findByBookingBookingId(bookingId).stream()
                .map(documentMapper::toDto)
                .toList();
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKER_PORTAL_READ')")
    public ResponseEntity<DocumentDto> findById(@PathVariable UUID id) {
        UUID bookingId = BookerContext.getBookingId();
        return documentRepository.findById(id)
                .filter(doc -> doc.getBooking().getBookingId().equals(bookingId))
                .map(documentMapper::toDto)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
