package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.DocumentTemplateDto;
import nl.puurkroatie.rds.booking.service.DocumentTemplateService;
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
@RequestMapping("/api/document-templates")
public class DocumentTemplateController {

    private final DocumentTemplateService documentTemplateService;

    public DocumentTemplateController(DocumentTemplateService documentTemplateService) {
        this.documentTemplateService = documentTemplateService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('TEMPLATE_READ')")
    public List<DocumentTemplateDto> findAll() {
        return documentTemplateService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('TEMPLATE_READ')")
    public ResponseEntity<DocumentTemplateDto> findById(@PathVariable UUID id) {
        return documentTemplateService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping(value = "/{id}/content", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    @PreAuthorize("hasAuthority('TEMPLATE_READ')")
    public ResponseEntity<byte[]> getContent(@PathVariable UUID id) {
        return documentTemplateService.findById(id)
                .map(dto -> {
                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
                    headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + dto.getName() + ".docx\"");
                    return ResponseEntity.ok().headers(headers).body(dto.getTemplateData());
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('TEMPLATE_CREATE')")
    public ResponseEntity<DocumentTemplateDto> create(@RequestBody @Valid DocumentTemplateDto dto) {
        DocumentTemplateDto created = documentTemplateService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('TEMPLATE_UPDATE')")
    public ResponseEntity<DocumentTemplateDto> update(@PathVariable UUID id, @RequestBody @Valid DocumentTemplateDto dto) {
        DocumentTemplateDto updated = documentTemplateService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('TEMPLATE_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        documentTemplateService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
