package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.AccommodationDto;
import nl.puurkroatie.rds.booking.service.AccommodationService;
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
@RequestMapping("/api/accommodations")
public class AccommodationController {

    private final AccommodationService accommodationService;

    public AccommodationController(AccommodationService accommodationService) {
        this.accommodationService = accommodationService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ACCOMMODATION_READ')")
    public List<AccommodationDto> findAll() {
        return accommodationService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ACCOMMODATION_READ')")
    public ResponseEntity<AccommodationDto> findById(@PathVariable UUID id) {
        return accommodationService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ACCOMMODATION_CREATE')")
    public ResponseEntity<AccommodationDto> create(@RequestBody @Valid AccommodationDto dto) {
        AccommodationDto created = accommodationService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ACCOMMODATION_UPDATE')")
    public ResponseEntity<AccommodationDto> update(@PathVariable UUID id, @RequestBody @Valid AccommodationDto dto) {
        AccommodationDto updated = accommodationService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ACCOMMODATION_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        accommodationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
