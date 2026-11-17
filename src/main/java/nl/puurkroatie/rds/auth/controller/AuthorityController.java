package nl.puurkroatie.rds.auth.controller;

import nl.puurkroatie.rds.auth.dto.AuthorityDto;
import nl.puurkroatie.rds.auth.service.AuthorityService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Authorities zijn alleen te lezen: ze komen uit Flyway, omdat ze pas iets doen als de code ze controleert. Aanmaken,
 * wijzigen en verwijderen via de API kan niet (405).
 */
@RestController
@RequestMapping("/api/authorities")
public class AuthorityController {

    private final AuthorityService authorityService;

    public AuthorityController(AuthorityService authorityService) {
        this.authorityService = authorityService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('AUTHORITY_READ')")
    public List<AuthorityDto> findAll() {
        return authorityService.findAll();
    }

    /** De authorities die de ingelogde gebruiker aan een rol mag geven (voor het rollenscherm). */
    @GetMapping("/grantable")
    @PreAuthorize("hasAuthority('AUTHORITY_READ')")
    public List<AuthorityDto> findGrantable() {
        return authorityService.findGrantable();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('AUTHORITY_READ')")
    public ResponseEntity<AuthorityDto> findById(@PathVariable UUID id) {
        return authorityService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
