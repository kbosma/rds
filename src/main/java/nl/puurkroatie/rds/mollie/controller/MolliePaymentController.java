package nl.puurkroatie.rds.mollie.controller;

import nl.puurkroatie.rds.mollie.dto.MolliePaymentDto;
import nl.puurkroatie.rds.mollie.dto.PaymentRequestDto;
import nl.puurkroatie.rds.mollie.dto.PaymentResponseDto;
import nl.puurkroatie.rds.mollie.dto.PaymentStatusRequestDto;
import nl.puurkroatie.rds.mollie.dto.PaymentStatusResponseDto;
import nl.puurkroatie.rds.mollie.service.MollieService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/mollie/payments")
public class MolliePaymentController {

    private final MollieService mollieService;

    public MolliePaymentController(MollieService mollieService) {
        this.mollieService = mollieService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PAYMENT_READ')")
    public List<MolliePaymentDto> findAll() {
        return mollieService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PAYMENT_READ')")
    public ResponseEntity<MolliePaymentDto> findById(@PathVariable UUID id) {
        return mollieService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PAYMENT_CREATE')")
    public ResponseEntity<MolliePaymentDto> create(@RequestBody @Valid MolliePaymentDto dto) {
        MolliePaymentDto created = mollieService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PAYMENT_UPDATE')")
    public ResponseEntity<MolliePaymentDto> update(@PathVariable UUID id, @RequestBody @Valid MolliePaymentDto dto) {
        MolliePaymentDto updated = mollieService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PAYMENT_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        mollieService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/create-at-mollie")
    @PreAuthorize("hasAuthority('PAYMENT_CREATE')")
    public ResponseEntity<PaymentResponseDto> createPaymentAtMollie(@RequestBody @Valid PaymentRequestDto request) {
        PaymentResponseDto response = mollieService.createPaymentAtMollie(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(@RequestParam("id") String id) {
        mollieService.updatePaymentFromMollie(new PaymentStatusRequestDto(id));
        return ResponseEntity.ok().build();
    }
}
