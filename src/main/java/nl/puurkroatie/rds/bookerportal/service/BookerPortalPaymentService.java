package nl.puurkroatie.rds.bookerportal.service;

import nl.puurkroatie.rds.booking.entity.BookingMolliePayment;
import nl.puurkroatie.rds.booking.repository.BookingMolliePaymentRepository;
import nl.puurkroatie.rds.mollie.config.MollieConfig;
import nl.puurkroatie.rds.mollie.dto.MolliePaymentDto;
import nl.puurkroatie.rds.mollie.dto.MolliePaymentStatusEntryDto;
import nl.puurkroatie.rds.mollie.dto.PaymentRequestDto;
import nl.puurkroatie.rds.mollie.dto.PaymentResponseDto;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import nl.puurkroatie.rds.mollie.mapper.MolliePaymentMapper;
import nl.puurkroatie.rds.mollie.mapper.MolliePaymentStatusEntryMapper;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentRepository;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentStatusEntryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.RoundingMode;
import java.util.Currency;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class BookerPortalPaymentService {

    private static final Logger log = LoggerFactory.getLogger(BookerPortalPaymentService.class);

    private final BookingMolliePaymentRepository bookingMolliePaymentRepository;
    private final MolliePaymentMapper molliePaymentMapper;
    private final MolliePaymentRepository molliePaymentRepository;
    private final MolliePaymentStatusEntryRepository statusEntryRepository;
    private final MolliePaymentStatusEntryMapper statusEntryMapper;
    private final RestClient mollieRestClient;
    private final MollieConfig mollieConfig;

    public BookerPortalPaymentService(BookingMolliePaymentRepository bookingMolliePaymentRepository,
                                       MolliePaymentMapper molliePaymentMapper,
                                       MolliePaymentRepository molliePaymentRepository,
                                       MolliePaymentStatusEntryRepository statusEntryRepository,
                                       MolliePaymentStatusEntryMapper statusEntryMapper,
                                       RestClient mollieRestClient,
                                       MollieConfig mollieConfig) {
        this.bookingMolliePaymentRepository = bookingMolliePaymentRepository;
        this.molliePaymentMapper = molliePaymentMapper;
        this.molliePaymentRepository = molliePaymentRepository;
        this.statusEntryRepository = statusEntryRepository;
        this.statusEntryMapper = statusEntryMapper;
        this.mollieRestClient = mollieRestClient;
        this.mollieConfig = mollieConfig;
    }

    @Transactional(readOnly = true)
    public List<MolliePaymentDto> findPaymentsByBookingId(UUID bookingId) {
        return bookingMolliePaymentRepository.findByBookingBookingId(bookingId).stream()
                .map(BookingMolliePayment::getMolliePayment)
                .map(molliePaymentMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MolliePaymentStatusEntryDto> findStatusEntriesByBookingId(UUID bookingId) {
        List<UUID> paymentIds = bookingMolliePaymentRepository.findByBookingBookingId(bookingId).stream()
                .map(bmp -> bmp.getMolliePayment().getMolliePaymentId())
                .toList();
        return statusEntryRepository.findByMolliePaymentMolliePaymentIdIn(paymentIds).stream()
                .map(statusEntryMapper::toDto)
                .toList();
    }

    public PaymentResponseDto initiatePayment(UUID molliePaymentId, UUID bookingId, String redirectUrl) {
        // Verify payment belongs to this booking
        boolean belongs = bookingMolliePaymentRepository.findByBookingBookingId(bookingId).stream()
                .anyMatch(bmp -> bmp.getMolliePayment().getMolliePaymentId().equals(molliePaymentId));

        if (!belongs) {
            throw new IllegalArgumentException("Payment does not belong to this booking");
        }

        MolliePayment payment = molliePaymentRepository.findById(molliePaymentId)
                .orElseThrow(() -> new RuntimeException("MolliePayment not found: " + molliePaymentId));

        // Build Mollie API request from existing payment data
        // Prefer the environment-configured redirect (e.g. a public IP in application-rds-tst.yaml);
        // fall back to the browser-derived URL only when no redirect is configured.
        String configuredRedirect = mollieConfig.getUrls().getRedirect();
        String effectiveRedirectUrl = (configuredRedirect != null && !configuredRedirect.isBlank())
                ? configuredRedirect
                : redirectUrl;

        // Mollie requires amount.value as a string with exactly the currency's decimal count (EUR -> "70.00")
        int fractionDigits = Currency.getInstance(payment.getCurrency()).getDefaultFractionDigits();
        String amountValue = payment.getAmount().setScale(fractionDigits, RoundingMode.HALF_UP).toPlainString();

        PaymentRequestDto request = new PaymentRequestDto(
                new PaymentRequestDto.Amount(payment.getCurrency(), amountValue),
                payment.getDescription(),
                effectiveRedirectUrl,
                mollieConfig.getUrls().getWebhook(),
                null
        );

        PaymentResponseDto response;
        try {
            response = mollieRestClient.post()
                    .body(request)
                    .retrieve()
                    .body(PaymentResponseDto.class);
        } catch (RestClientResponseException ex) {
            log.error("Mollie payment creation failed ({}). redirectUrl={}, webhookUrl={}, Mollie response: {}",
                    ex.getStatusCode(), effectiveRedirectUrl, mollieConfig.getUrls().getWebhook(),
                    ex.getResponseBodyAsString(), ex);
            throw ex;
        }

        if (response != null && response.getId() != null) {
            String checkoutUrl = response.getLinks() != null && response.getLinks().getCheckout() != null
                    ? response.getLinks().getCheckout().getHref()
                    : null;
            // Update existing payment with Mollie external ID and checkout URL
            MolliePayment updated = new MolliePayment(
                    payment.getMolliePaymentId(),
                    response.getId(),
                    payment.getMethod(),
                    payment.getAmount(),
                    payment.getCurrency(),
                    payment.getDescription(),
                    checkoutUrl
            );
            molliePaymentRepository.save(updated);
        }

        return response;
    }
}
