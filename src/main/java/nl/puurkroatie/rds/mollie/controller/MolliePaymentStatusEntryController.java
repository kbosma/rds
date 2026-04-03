package nl.puurkroatie.rds.mollie.controller;

import jakarta.validation.Valid;
import nl.puurkroatie.rds.mollie.dto.MolliePaymentStatusEntryDto;
import nl.puurkroatie.rds.mollie.service.MolliePaymentStatusEntryService;
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
@RequestMapping("/api/mollie/payment-status-entries")
public class MolliePaymentStatusEntryController {

    private final MolliePaymentStatusEntryService statusEntryService;

    public MolliePaymentStatusEntryController(MolliePaymentStatusEntryService statusEntryService) {
        this.statusEntryService = statusEntryService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PAYMENT_READ')")
    public List<MolliePaymentStatusEntryDto> findAll() {
        return statusEntryService.findAll();
    }

    @GetMapping("/by-payment/{molliePaymentId}")
    @PreAuthorize("hasAuthority('PAYMENT_READ')")
    public List<MolliePaymentStatusEntryDto> findByMolliePaymentId(@PathVariable UUID molliePaymentId) {
        return statusEntryService.findByMolliePaymentId(molliePaymentId);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PAYMENT_CREATE')")
    public ResponseEntity<MolliePaymentStatusEntryDto> create(@RequestBody @Valid MolliePaymentStatusEntryDto dto) {
        MolliePaymentStatusEntryDto created = statusEntryService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PAYMENT_UPDATE')")
    public ResponseEntity<MolliePaymentStatusEntryDto> update(@PathVariable UUID id, @RequestBody @Valid MolliePaymentStatusEntryDto dto) {
        MolliePaymentStatusEntryDto updated = statusEntryService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PAYMENT_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        statusEntryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
