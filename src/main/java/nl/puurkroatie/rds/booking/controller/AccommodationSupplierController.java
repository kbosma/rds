package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.AccommodationSupplierDto;
import nl.puurkroatie.rds.booking.service.AccommodationSupplierService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/accommodation-suppliers")
public class AccommodationSupplierController {

    private final AccommodationSupplierService accommodationSupplierService;

    public AccommodationSupplierController(AccommodationSupplierService accommodationSupplierService) {
        this.accommodationSupplierService = accommodationSupplierService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ACCOMMODATION_READ')")
    public List<AccommodationSupplierDto> findAll() {
        return accommodationSupplierService.findAll();
    }

    @GetMapping("/{accommodationId}/{supplierId}")
    @PreAuthorize("hasAuthority('ACCOMMODATION_READ')")
    public ResponseEntity<AccommodationSupplierDto> findById(@PathVariable UUID accommodationId, @PathVariable UUID supplierId) {
        return accommodationSupplierService.findById(accommodationId, supplierId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ACCOMMODATION_CREATE')")
    public ResponseEntity<AccommodationSupplierDto> create(@RequestBody @Valid AccommodationSupplierDto dto) {
        AccommodationSupplierDto created = accommodationSupplierService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/{accommodationId}/{supplierId}")
    @PreAuthorize("hasAuthority('ACCOMMODATION_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID accommodationId, @PathVariable UUID supplierId) {
        accommodationSupplierService.delete(accommodationId, supplierId);
        return ResponseEntity.noContent().build();
    }
}
