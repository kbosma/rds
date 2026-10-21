package nl.puurkroatie.rds.bookerportal.controller;

import nl.puurkroatie.rds.bookerportal.dto.PortalDocumentContentDto;
import nl.puurkroatie.rds.bookerportal.dto.PortalDocumentDto;
import nl.puurkroatie.rds.bookerportal.security.BookerContext;
import nl.puurkroatie.rds.bookerportal.service.BookerPortalDocumentService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/booker-portal/documents")
public class BookerPortalDocumentController {

    private final BookerPortalDocumentService documentService;

    public BookerPortalDocumentController(BookerPortalDocumentService documentService) {
        this.documentService = documentService;
    }

    /** De zichtbare documenten van de eigen boeking, zonder de bytes. */
    @GetMapping
    @PreAuthorize("hasAuthority('BOOKER_PORTAL_READ')")
    public ResponseEntity<List<PortalDocumentDto>> findAll() {
        return ResponseEntity.ok(documentService.findDocuments(BookerContext.getBookingId()));
    }

    /** Het bestand van één zichtbaar document van de eigen boeking; anders 404. */
    @GetMapping("/{id}/content")
    @PreAuthorize("hasAuthority('BOOKER_PORTAL_READ')")
    public ResponseEntity<byte[]> getContent(@PathVariable UUID id) {
        PortalDocumentContentDto document = documentService.findContent(BookerContext.getBookingId(), id);
        MediaType mediaType = document.mimeType() != null
                ? MediaType.parseMediaType(document.mimeType())
                : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(document.displayname(), StandardCharsets.UTF_8).build().toString())
                .body(document.content());
    }
}
