package nl.puurkroatie.rds.auth.controller;

import nl.puurkroatie.rds.auth.dto.OrganizationDto;
import nl.puurkroatie.rds.auth.service.OrganizationService;
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
@RequestMapping("/api/organizations")
public class OrganizationController {

    private final OrganizationService organizationService;

    public OrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ORGANIZATION_READ')")
    public List<OrganizationDto> findAll() {
        return organizationService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ORGANIZATION_READ')")
    public ResponseEntity<OrganizationDto> findById(@PathVariable UUID id) {
        return organizationService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ORGANIZATION_CREATE')")
    public ResponseEntity<OrganizationDto> create(@RequestBody @Valid OrganizationDto dto) {
        OrganizationDto created = organizationService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ORGANIZATION_UPDATE')")
    public ResponseEntity<OrganizationDto> update(@PathVariable UUID id, @RequestBody @Valid OrganizationDto dto) {
        OrganizationDto updated = organizationService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ORGANIZATION_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        organizationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
