package nl.puurkroatie.rds.mollie.controller;

import jakarta.validation.Valid;
import nl.puurkroatie.rds.mollie.dto.MolliePaymentStatusEntryDto;
import nl.puurkroatie.rds.mollie.dto.PaymentCorrectionRequestDto;
import nl.puurkroatie.rds.mollie.service.MolliePaymentStatusEntryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

    /**
     * Registreert een handmatige correctie van de status van een betaling (een nieuwe regel in de historie, met de
     * reden). Een bestaande regel wijzigen of verwijderen kan niet: de historie is alleen-toevoegen.
     */
    @PostMapping("/by-payment/{molliePaymentId}")
    @PreAuthorize("hasAuthority('PAYMENT_CORRECT')")
    public ResponseEntity<MolliePaymentStatusEntryDto> createCorrection(@PathVariable UUID molliePaymentId,
                                                                        @RequestBody @Valid PaymentCorrectionRequestDto request) {
        MolliePaymentStatusEntryDto created = statusEntryService.createCorrection(
                molliePaymentId, request.getStatus(), request.getReason());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
