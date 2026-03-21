package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.GenderDto;
import nl.puurkroatie.rds.booking.service.GenderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/genders")
public class GenderController {

    private final GenderService genderService;

    public GenderController(GenderService genderService) {
        this.genderService = genderService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public List<GenderDto> findAll() {
        return genderService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOKING_READ')")
    public ResponseEntity<GenderDto> findById(@PathVariable UUID id) {
        return genderService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
