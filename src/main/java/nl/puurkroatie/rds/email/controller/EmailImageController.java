package nl.puurkroatie.rds.email.controller;

import nl.puurkroatie.rds.email.dto.EmailImageDto;
import nl.puurkroatie.rds.email.dto.EmailImageListItemDto;
import nl.puurkroatie.rds.email.service.EmailImageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Upload van afbeeldingen voor e-mailtemplates (achter login). Het publiek
 * uitleveren zit bewust in een aparte controller: {@link PublicEmailImageController}.
 */
@RestController
@RequestMapping("/api/email-images")
public class EmailImageController {

    private final EmailImageService emailImageService;

    public EmailImageController(EmailImageService emailImageService) {
        this.emailImageService = emailImageService;
    }

    // Wie templates mag aanmaken of wijzigen mag er ook afbeeldingen voor uploaden.
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('TEMPLATE_CREATE', 'TEMPLATE_UPDATE')")
    public ResponseEntity<EmailImageDto> upload(@RequestParam("file") MultipartFile file) throws IOException {
        EmailImageDto created = emailImageService.upload(file.getOriginalFilename(), file.getBytes());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // De bibliotheek (zonder bytes). Dezelfde rechten als uploaden: je ziet wat je kunt gebruiken.
    @GetMapping
    @PreAuthorize("hasAnyAuthority('TEMPLATE_CREATE', 'TEMPLATE_UPDATE')")
    public List<EmailImageListItemDto> findAll() {
        return emailImageService.findAll();
    }

    // Verwijderen is destructief (verstuurde mails verliezen het plaatje): zelfde recht als template verwijderen.
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('TEMPLATE_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        emailImageService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
