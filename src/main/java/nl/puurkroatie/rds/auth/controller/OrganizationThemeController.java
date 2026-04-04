package nl.puurkroatie.rds.auth.controller;

import nl.puurkroatie.rds.auth.dto.OrganizationThemeDto;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.auth.service.OrganizationThemeService;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/api/organization-themes")
public class OrganizationThemeController {

    private final OrganizationThemeService organizationThemeService;

    public OrganizationThemeController(OrganizationThemeService organizationThemeService) {
        this.organizationThemeService = organizationThemeService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ORGANIZATION_THEME_READ')")
    public List<OrganizationThemeDto> findAll() {
        return organizationThemeService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ORGANIZATION_THEME_READ')")
    public ResponseEntity<OrganizationThemeDto> findById(@PathVariable UUID id) {
        return organizationThemeService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/my-theme")
    public ResponseEntity<OrganizationThemeDto> findMyTheme() {
        UUID organizationId = TenantContext.getOrganizationId();
        return organizationThemeService.findByOrganizationId(organizationId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ORGANIZATION_THEME_CREATE')")
    public ResponseEntity<OrganizationThemeDto> create(@RequestBody @Valid OrganizationThemeDto dto) {
        OrganizationThemeDto created = organizationThemeService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ORGANIZATION_THEME_UPDATE')")
    public ResponseEntity<OrganizationThemeDto> update(@PathVariable UUID id, @RequestBody @Valid OrganizationThemeDto dto) {
        OrganizationThemeDto updated = organizationThemeService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ORGANIZATION_THEME_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        organizationThemeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
