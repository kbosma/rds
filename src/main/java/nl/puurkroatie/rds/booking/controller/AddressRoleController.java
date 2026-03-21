package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.AddressRoleDto;
import nl.puurkroatie.rds.booking.service.AddressRoleService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/address-roles")
public class AddressRoleController {

    private final AddressRoleService addressRoleService;

    public AddressRoleController(AddressRoleService addressRoleService) {
        this.addressRoleService = addressRoleService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<AddressRoleDto> findAll() {
        return addressRoleService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public ResponseEntity<AddressRoleDto> findById(@PathVariable UUID id) {
        return addressRoleService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
