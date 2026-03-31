package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.SupplierAddressDto;
import nl.puurkroatie.rds.booking.service.SupplierAddressService;
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
@RequestMapping("/api/supplier-addresses")
public class SupplierAddressController {

    private final SupplierAddressService supplierAddressService;

    public SupplierAddressController(SupplierAddressService supplierAddressService) {
        this.supplierAddressService = supplierAddressService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<SupplierAddressDto> findAll() {
        return supplierAddressService.findAll();
    }

    @GetMapping("/{supplierId}/{addressId}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public ResponseEntity<SupplierAddressDto> findById(@PathVariable UUID supplierId, @PathVariable UUID addressId) {
        return supplierAddressService.findById(supplierId, addressId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BOOKING_CREATE')")
    public ResponseEntity<SupplierAddressDto> create(@RequestBody @Valid SupplierAddressDto dto) {
        SupplierAddressDto created = supplierAddressService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/{supplierId}/{addressId}")
    @PreAuthorize("hasAuthority('BOOKING_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID supplierId, @PathVariable UUID addressId) {
        supplierAddressService.delete(supplierId, addressId);
        return ResponseEntity.noContent().build();
    }
}
