package nl.puurkroatie.rds.mollie.service;

import nl.puurkroatie.rds.mollie.dto.MolliePaymentStatusEntryDto;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatus;

import java.util.List;
import java.util.UUID;

public interface MolliePaymentStatusEntryService {

    List<MolliePaymentStatusEntryDto> findAll();

    List<MolliePaymentStatusEntryDto> findByMolliePaymentId(UUID molliePaymentId);

    /**
     * Registreert een handmatige correctie van de status van een betaling, door een medewerker en met een reden.
     * Dit voegt altijd een NIEUWE regel toe; een bestaande regel (ook van Mollie) wordt nooit gewijzigd of verwijderd.
     */
    MolliePaymentStatusEntryDto createCorrection(UUID molliePaymentId, String status, String reason);

    void createInitialStatus(UUID molliePaymentId);

    void createStatusFromWebhook(UUID molliePaymentId, MolliePaymentStatus status);
}
