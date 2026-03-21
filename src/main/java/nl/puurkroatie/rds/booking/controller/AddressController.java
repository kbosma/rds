package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.AddressDto;
import nl.puurkroatie.rds.booking.service.AddressService;
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
@RequestMapping("/api/addresses")
public class AddressController {

    private final AddressService addressService;

    public AddressController(AddressService addressService) {
        this.addressService = addressService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<AddressDto> findAll() {
        return addressService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public ResponseEntity<AddressDto> findById(@PathVariable UUID id) {
        return addressService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BOOKING_WRITE')")
    public ResponseEntity<AddressDto> create(@RequestBody AddressDto dto) {
        AddressDto created = addressService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_WRITE')")
    public ResponseEntity<AddressDto> update(@PathVariable UUID id, @RequestBody AddressDto dto) {
        AddressDto updated = addressService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        addressService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
