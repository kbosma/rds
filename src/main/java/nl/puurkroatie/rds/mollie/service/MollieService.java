package nl.puurkroatie.rds.mollie.service;

import nl.puurkroatie.rds.mollie.dto.MolliePaymentDto;
import nl.puurkroatie.rds.mollie.dto.PaymentRequestDto;
import nl.puurkroatie.rds.mollie.dto.PaymentResponseDto;
import nl.puurkroatie.rds.mollie.dto.PaymentStatusRequestDto;
import nl.puurkroatie.rds.mollie.dto.PaymentStatusResponseDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MollieService {

    MolliePaymentDto create(MolliePaymentDto dto);

    MolliePaymentDto update(UUID id, MolliePaymentDto dto);

    void delete(UUID id);

    List<MolliePaymentDto> findAll();

    Optional<MolliePaymentDto> findById(UUID id);

    PaymentResponseDto createPaymentAtMollie(PaymentRequestDto request);

    PaymentStatusResponseDto updatePaymentFromMollie(PaymentStatusRequestDto request);
}
