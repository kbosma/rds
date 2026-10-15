package nl.puurkroatie.rds.email.controller;

import nl.puurkroatie.rds.email.service.EmailImageService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.UUID;

/**
 * Publieke (zonder login) uitlevering van e-mailafbeeldingen. Een mailclient van een
 * ontvanger heeft geen JWT, dus dit pad staat open in de SecurityConfig, uitsluitend
 * voor GET op /api/public/email-images/{id}.
 *
 * Veiligheid: de UUID is onraadbaar; het Content-Type komt uit de bytes bij upload
 * (alleen PNG/JPEG/GIF/WebP, nooit SVG); de afbeelding wordt met een restrictieve
 * Content-Security-Policy uitgeleverd, mocht iemand de URL toch als pagina openen.
 */
@RestController
@RequestMapping("/api/public/email-images")
public class PublicEmailImageController {

    private final EmailImageService emailImageService;

    public PublicEmailImageController(EmailImageService emailImageService) {
        this.emailImageService = emailImageService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> get(@PathVariable UUID id) {
        return emailImageService.findContent(id)
                .map(content -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(content.getContentType()))
                        // De afbeelding is onveranderlijk (nieuwe versie = nieuwe UUID).
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                        .header("Content-Security-Policy", "default-src 'none'; sandbox")
                        .body(content.getData()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
