package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.SupplierDto;
import nl.puurkroatie.rds.booking.service.SupplierService;
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
@RequestMapping("/api/suppliers")
public class SupplierController {

    private final SupplierService supplierService;

    public SupplierController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<SupplierDto> findAll() {
        return supplierService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public ResponseEntity<SupplierDto> findById(@PathVariable UUID id) {
        return supplierService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BOOKING_WRITE')")
    public ResponseEntity<SupplierDto> create(@RequestBody SupplierDto dto) {
        SupplierDto created = supplierService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_WRITE')")
    public ResponseEntity<SupplierDto> update(@PathVariable UUID id, @RequestBody SupplierDto dto) {
        SupplierDto updated = supplierService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        supplierService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
