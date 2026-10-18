package nl.puurkroatie.rds.mollie.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.common.PaymentLockedException;
import nl.puurkroatie.rds.mollie.dto.MolliePaymentDto;
import nl.puurkroatie.rds.mollie.dto.PaymentRequestDto;
import nl.puurkroatie.rds.mollie.dto.PaymentResponseDto;
import nl.puurkroatie.rds.mollie.dto.PaymentStatusRequestDto;
import nl.puurkroatie.rds.mollie.dto.PaymentStatusResponseDto;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatus;
import nl.puurkroatie.rds.mollie.mapper.MolliePaymentMapper;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentRepository;
import nl.puurkroatie.rds.mollie.service.MolliePaymentStatusEntryService;
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
    private final MolliePaymentStatusEntryService statusEntryService;

    public MollieServiceImpl(MolliePaymentRepository molliePaymentRepository, RestClient mollieRestClient, MolliePaymentMapper molliePaymentMapper, MolliePaymentStatusEntryService statusEntryService) {
        this.molliePaymentRepository = molliePaymentRepository;
        this.mollieRestClient = mollieRestClient;
        this.molliePaymentMapper = molliePaymentMapper;
        this.statusEntryService = statusEntryService;
    }

    @Override
    public MolliePaymentDto create(MolliePaymentDto dto) {
        // Een nieuwe betaling is een aankondiging: het Mollie-id en de checkout-URL komen alleen van Mollie
        // (zodra de klant betaalt) en kunnen hier niet door een client worden gezet.
        MolliePayment entity = new MolliePayment(
                null,
                dto.getMethod(),
                dto.getAmount(),
                dto.getCurrency(),
                dto.getDescription(),
                null
        );
        MolliePayment saved = molliePaymentRepository.save(entity);
        statusEntryService.createInitialStatus(saved.getMolliePaymentId());
        return molliePaymentMapper.toDto(saved);
    }

    @Override
    public MolliePaymentDto update(UUID id, MolliePaymentDto dto) {
        MolliePayment existing = molliePaymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("MolliePayment not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        // Zodra de betaling bij Mollie bestaat (er is een Mollie-id) is ze geschiedenis en kan ze niet meer worden
        // gewijzigd; alleen een nog niet bij Mollie aangemaakte betaling (een aankondiging) mag aangepast worden.
        if (existing.getMolliePaymentExternalId() != null && !existing.getMolliePaymentExternalId().isBlank()) {
            throw new PaymentLockedException("The payment already exists at Mollie (" + existing.getMolliePaymentExternalId()
                    + ") and can no longer be changed");
        }
        // Het Mollie-id en de checkout-URL zijn van de server: een client kan ze niet zetten of wissen.
        MolliePayment entity = new MolliePayment(
                id,
                existing.getMolliePaymentExternalId(),
                dto.getMethod(),
                dto.getAmount(),
                dto.getCurrency(),
                dto.getDescription(),
                existing.getCheckoutUrl()
        );
        MolliePayment saved = molliePaymentRepository.save(entity);
        return molliePaymentMapper.toDto(saved);
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

            MolliePayment entity = new MolliePayment(
                    response.getId(),
                    null,
                    amount,
                    currency,
                    response.getDescription(),
                    checkoutUrl
            );
            MolliePayment saved = molliePaymentRepository.save(entity);
            statusEntryService.createInitialStatus(saved.getMolliePaymentId());
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
                        MolliePayment updated = new MolliePayment(
                                existing.getMolliePaymentId(),
                                existing.getMolliePaymentExternalId(),
                                existing.getMethod(),
                                existing.getAmount(),
                                existing.getCurrency(),
                                existing.getDescription(),
                                existing.getCheckoutUrl()
                        );
                        molliePaymentRepository.save(updated);
                        MolliePaymentStatus status = response.getStatus() != null ? MolliePaymentStatus.fromValue(response.getStatus()) : null;
                        if (status != null) {
                            statusEntryService.createStatusFromWebhook(existing.getMolliePaymentId(), status);
                        }
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
