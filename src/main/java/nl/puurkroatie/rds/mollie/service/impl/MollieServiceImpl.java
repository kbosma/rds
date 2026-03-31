package nl.puurkroatie.rds.mollie.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.mollie.dto.MolliePaymentDto;
import nl.puurkroatie.rds.mollie.dto.PaymentRequestDto;
import nl.puurkroatie.rds.mollie.dto.PaymentResponseDto;
import nl.puurkroatie.rds.mollie.dto.PaymentStatusRequestDto;
import nl.puurkroatie.rds.mollie.dto.PaymentStatusResponseDto;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatus;
import nl.puurkroatie.rds.mollie.mapper.MolliePaymentMapper;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentRepository;
import nl.puurkroatie.rds.mollie.service.MollieService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class MollieServiceImpl implements MollieService {

    private final MolliePaymentRepository molliePaymentRepository;
    private final RestClient mollieRestClient;
    private final MolliePaymentMapper molliePaymentMapper;

    public MollieServiceImpl(MolliePaymentRepository molliePaymentRepository, RestClient mollieRestClient, MolliePaymentMapper molliePaymentMapper) {
        this.molliePaymentRepository = molliePaymentRepository;
        this.mollieRestClient = mollieRestClient;
        this.molliePaymentMapper = molliePaymentMapper;
    }

    @Override
    public MolliePaymentDto create(MolliePaymentDto dto) {
        MolliePaymentStatus status = dto.getStatus() != null ? MolliePaymentStatus.fromValue(dto.getStatus()) : null;
        MolliePayment entity = new MolliePayment(
                dto.getMolliePaymentExternalId(),
                status,
                dto.getMethod(),
                dto.getAmount(),
                dto.getCurrency(),
                dto.getDescription(),
                dto.getCheckoutUrl()
        );
        MolliePayment saved = molliePaymentRepository.save(entity);
        return molliePaymentMapper.toDto(saved);
    }

    @Override
    public MolliePaymentDto update(UUID id, MolliePaymentDto dto) {
        MolliePayment existing = molliePaymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("MolliePayment not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        MolliePaymentStatus status = dto.getStatus() != null ? MolliePaymentStatus.fromValue(dto.getStatus()) : null;
        MolliePayment entity = new MolliePayment(
                id,
                dto.getMolliePaymentExternalId(),
                status,
                dto.getMethod(),
                dto.getAmount(),
                dto.getCurrency(),
                dto.getDescription(),
                dto.getCheckoutUrl()
        );
        MolliePayment saved = molliePaymentRepository.save(entity);
        return molliePaymentMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        MolliePayment existing = molliePaymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("MolliePayment not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        molliePaymentRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MolliePaymentDto> findAll() {
        if (isAdmin()) {
            return molliePaymentRepository.findAll().stream()
                    .map(molliePaymentMapper::toDto)
                    .toList();
        }
        return molliePaymentRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(molliePaymentMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<MolliePaymentDto> findById(UUID id) {
        return molliePaymentRepository.findById(id)
                .filter(entity -> isAdmin() || entity.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(molliePaymentMapper::toDto);
    }

    @Override
    public PaymentResponseDto createPaymentAtMollie(PaymentRequestDto request) {
        PaymentResponseDto response = mollieRestClient.post()
                .body(request)
                .retrieve()
                .body(PaymentResponseDto.class);

        if (response != null && response.getId() != null) {
            BigDecimal amount = response.getAmount() != null ? new BigDecimal(response.getAmount().getValue()) : null;
            String currency = response.getAmount() != null ? response.getAmount().getCurrency() : null;
            String checkoutUrl = response.getLinks() != null && response.getLinks().getCheckout() != null ? response.getLinks().getCheckout().getHref() : null;

            MolliePaymentStatus status = response.getStatus() != null ? MolliePaymentStatus.fromValue(response.getStatus()) : null;

            MolliePayment entity = new MolliePayment(
                    response.getId(),
                    status,
                    null,
                    amount,
                    currency,
                    response.getDescription(),
                    checkoutUrl
            );
            molliePaymentRepository.save(entity);
        }

        return response;
    }

    @Override
    public PaymentStatusResponseDto updatePaymentFromMollie(PaymentStatusRequestDto request) {
        PaymentStatusResponseDto response = mollieRestClient.get()
                .uri("/{id}", request.getId())
                .retrieve()
                .body(PaymentStatusResponseDto.class);

        if (response != null) {
            molliePaymentRepository.findByMolliePaymentExternalId(request.getId())
                    .ifPresent(existing -> {
                        MolliePaymentStatus status = response.getStatus() != null ? MolliePaymentStatus.fromValue(response.getStatus()) : null;
                        MolliePayment updated = new MolliePayment(
                                existing.getMolliePaymentId(),
                                existing.getMolliePaymentExternalId(),
                                status,
                                existing.getMethod(),
                                existing.getAmount(),
                                existing.getCurrency(),
                                existing.getDescription(),
                                existing.getCheckoutUrl()
                        );
                        molliePaymentRepository.save(updated);
                    });
        }

        return response;
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }
}
