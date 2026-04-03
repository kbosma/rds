package nl.puurkroatie.rds.mollie.service;

import nl.puurkroatie.rds.mollie.dto.MolliePaymentStatusEntryDto;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatus;

import java.util.List;
import java.util.UUID;

public interface MolliePaymentStatusEntryService {

    List<MolliePaymentStatusEntryDto> findAll();

    List<MolliePaymentStatusEntryDto> findByMolliePaymentId(UUID molliePaymentId);

    MolliePaymentStatusEntryDto create(MolliePaymentStatusEntryDto dto);

    MolliePaymentStatusEntryDto update(UUID id, MolliePaymentStatusEntryDto dto);

    void delete(UUID id);

    void createInitialStatus(UUID molliePaymentId);

    void createStatusFromWebhook(UUID molliePaymentId, MolliePaymentStatus status);
}
