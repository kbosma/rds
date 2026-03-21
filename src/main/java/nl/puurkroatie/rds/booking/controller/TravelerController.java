package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.TravelerDto;
import nl.puurkroatie.rds.booking.service.TravelerService;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/travelers")
public class TravelerController {

    private final TravelerService travelerService;

    public TravelerController(TravelerService travelerService) {
        this.travelerService = travelerService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<TravelerDto> findAll() {
        return travelerService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public ResponseEntity<TravelerDto> findById(@PathVariable UUID id) {
        return travelerService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BOOKING_WRITE')")
    public ResponseEntity<TravelerDto> create(@RequestBody TravelerDto dto) {
        TravelerDto created = travelerService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_WRITE')")
    public ResponseEntity<TravelerDto> update(@PathVariable UUID id, @RequestBody TravelerDto dto) {
        TravelerDto updated = travelerService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        travelerService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
