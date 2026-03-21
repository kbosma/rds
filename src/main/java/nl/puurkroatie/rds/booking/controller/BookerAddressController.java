package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.BookerAddressDto;
import nl.puurkroatie.rds.booking.service.BookerAddressService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/booker-addresses")
public class BookerAddressController {

    private final BookerAddressService bookerAddressService;

    public BookerAddressController(BookerAddressService bookerAddressService) {
        this.bookerAddressService = bookerAddressService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<BookerAddressDto> findAll() {
        return bookerAddressService.findAll();
    }

    @GetMapping("/{bookerId}/{addressId}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public ResponseEntity<BookerAddressDto> findById(@PathVariable UUID bookerId, @PathVariable UUID addressId) {
        return bookerAddressService.findById(bookerId, addressId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BOOKING_WRITE')")
    public ResponseEntity<BookerAddressDto> create(@RequestBody BookerAddressDto dto) {
        BookerAddressDto created = bookerAddressService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/{bookerId}/{addressId}")
    @PreAuthorize("hasAuthority('BOOKING_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID bookerId, @PathVariable UUID addressId) {
        bookerAddressService.delete(bookerId, addressId);
        return ResponseEntity.noContent().build();
    }
}
