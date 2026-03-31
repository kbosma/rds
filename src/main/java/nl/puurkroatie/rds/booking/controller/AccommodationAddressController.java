package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.AccommodationAddressDto;
import nl.puurkroatie.rds.booking.service.AccommodationAddressService;
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
@RequestMapping("/api/accommodation-addresses")
public class AccommodationAddressController {

    private final AccommodationAddressService accommodationAddressService;

    public AccommodationAddressController(AccommodationAddressService accommodationAddressService) {
        this.accommodationAddressService = accommodationAddressService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<AccommodationAddressDto> findAll() {
        return accommodationAddressService.findAll();
    }

    @GetMapping("/{accommodationId}/{addressId}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public ResponseEntity<AccommodationAddressDto> findById(@PathVariable UUID accommodationId, @PathVariable UUID addressId) {
        return accommodationAddressService.findById(accommodationId, addressId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BOOKING_CREATE')")
    public ResponseEntity<AccommodationAddressDto> create(@RequestBody @Valid AccommodationAddressDto dto) {
        AccommodationAddressDto created = accommodationAddressService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/{accommodationId}/{addressId}")
    @PreAuthorize("hasAuthority('BOOKING_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID accommodationId, @PathVariable UUID addressId) {
        accommodationAddressService.delete(accommodationId, addressId);
        return ResponseEntity.noContent().build();
    }
}
