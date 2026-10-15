package nl.puurkroatie.rds.email.controller;

import nl.puurkroatie.rds.email.dto.EmailRenderDto;
import nl.puurkroatie.rds.email.dto.EmailSendResultDto;
import nl.puurkroatie.rds.email.dto.EmailTemplateDto;
import nl.puurkroatie.rds.email.service.EmailRenderService;
import nl.puurkroatie.rds.email.service.EmailSendService;
import nl.puurkroatie.rds.email.service.EmailTemplateService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/email-templates")
public class EmailTemplateController {

    private final EmailTemplateService emailTemplateService;
    private final EmailRenderService emailRenderService;
    private final EmailSendService emailSendService;

    public EmailTemplateController(EmailTemplateService emailTemplateService,
                                   EmailRenderService emailRenderService,
                                   EmailSendService emailSendService) {
        this.emailTemplateService = emailTemplateService;
        this.emailRenderService = emailRenderService;
        this.emailSendService = emailSendService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('TEMPLATE_READ')")
    public List<EmailTemplateDto> findAll() {
        return emailTemplateService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('TEMPLATE_READ')")
    public ResponseEntity<EmailTemplateDto> findById(@PathVariable UUID id) {
        return emailTemplateService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('TEMPLATE_CREATE')")
    public ResponseEntity<EmailTemplateDto> create(@RequestBody @Valid EmailTemplateDto dto) {
        EmailTemplateDto created = emailTemplateService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('TEMPLATE_UPDATE')")
    public ResponseEntity<EmailTemplateDto> update(@PathVariable UUID id, @RequestBody @Valid EmailTemplateDto dto) {
        return ResponseEntity.ok(emailTemplateService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('TEMPLATE_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        emailTemplateService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // Merge-preview (verstuurt niets): voor een boeker/prospect (bookerId) OF voor een boeking (bookingId).
    @PostMapping("/{id}/render")
    @PreAuthorize("hasAuthority('TEMPLATE_READ')")
    public ResponseEntity<EmailRenderDto> render(@PathVariable UUID id,
                                                 @RequestParam(required = false) UUID bookerId,
                                                 @RequestParam(required = false) UUID bookingId) {
        requireExactlyOne(bookerId, bookingId);
        return ResponseEntity.ok(bookerId != null
                ? emailRenderService.render(id, bookerId)
                : emailRenderService.renderForBooking(id, bookingId));
    }

    // Verstuurt de gemergde template daadwerkelijk (vereist EMAIL_SEND): naar de boeker, of naar de
    // hoofdboeker van de boeking.
    @PostMapping("/{id}/send")
    @PreAuthorize("hasAuthority('EMAIL_SEND')")
    public ResponseEntity<EmailSendResultDto> send(@PathVariable UUID id,
                                                   @RequestParam(required = false) UUID bookerId,
                                                   @RequestParam(required = false) UUID bookingId) {
        requireExactlyOne(bookerId, bookingId);
        return ResponseEntity.ok(bookerId != null
                ? emailSendService.sendToBooker(id, bookerId)
                : emailSendService.sendForBooking(id, bookingId));
    }

    /** Het doel is of een boeker/prospect, of een boeking; nooit beide of geen. */
    private static void requireExactlyOne(UUID bookerId, UUID bookingId) {
        if ((bookerId == null) == (bookingId == null)) {
            throw new IllegalArgumentException("Provide exactly one of 'bookerId' or 'bookingId'.");
        }
    }
}
