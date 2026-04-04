package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.DocumentDto;
import nl.puurkroatie.rds.booking.service.DocumentService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<DocumentDto> findAll() {
        return documentService.findAll();
    }

    @GetMapping("/booking/{bookingId}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<DocumentDto> findByBookingId(@PathVariable UUID bookingId) {
        return documentService.findByBookingId(bookingId);
    }

    @GetMapping(value = "/{id}/content", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public ResponseEntity<byte[]> getContent(@PathVariable UUID id) {
        return documentService.findById(id)
                .map(doc -> {
                    MediaType mediaType = doc.getMimeType() != null
                            ? MediaType.parseMediaType(doc.getMimeType())
                            : MediaType.APPLICATION_OCTET_STREAM;
                    String disposition = mediaType.equals(MediaType.APPLICATION_PDF) ? "inline" : "attachment";
                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(mediaType);
                    headers.set(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + doc.getDisplayname() + "\"");
                    return ResponseEntity.ok().headers(headers).body(doc.getDocument());
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public ResponseEntity<DocumentDto> findById(@PathVariable UUID id) {
        return documentService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BOOKING_CREATE')")
    public ResponseEntity<DocumentDto> create(@RequestBody @Valid DocumentDto dto) {
        DocumentDto created = documentService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_UPDATE')")
    public ResponseEntity<DocumentDto> update(@PathVariable UUID id, @RequestBody @Valid DocumentDto dto) {
        DocumentDto updated = documentService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        documentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
