package nl.puurkroatie.rds.bookerportal.service;

import nl.puurkroatie.rds.bookerportal.dto.PortalPaymentDto;
import nl.puurkroatie.rds.bookerportal.dto.PortalPaymentStatusDto;
import nl.puurkroatie.rds.bookerportal.mapper.PortalMapper;
import nl.puurkroatie.rds.booking.entity.BookingMolliePayment;
import nl.puurkroatie.rds.booking.repository.BookingMolliePaymentRepository;
import nl.puurkroatie.rds.mollie.config.MollieConfig;
import nl.puurkroatie.rds.mollie.dto.PaymentRequestDto;
import nl.puurkroatie.rds.mollie.dto.PaymentResponseDto;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatus;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatusEntry;
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
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class BookerPortalPaymentService {

    private static final Logger log = LoggerFactory.getLogger(BookerPortalPaymentService.class);

    private final BookingMolliePaymentRepository bookingMolliePaymentRepository;
    private final MolliePaymentRepository molliePaymentRepository;
    private final MolliePaymentStatusEntryRepository statusEntryRepository;
    private final PortalMapper portalMapper;
    private final RestClient mollieRestClient;
    private final MollieConfig mollieConfig;

    public BookerPortalPaymentService(BookingMolliePaymentRepository bookingMolliePaymentRepository,
                                       MolliePaymentRepository molliePaymentRepository,
                                       MolliePaymentStatusEntryRepository statusEntryRepository,
                                       PortalMapper portalMapper,
                                       RestClient mollieRestClient,
                                       MollieConfig mollieConfig) {
        this.bookingMolliePaymentRepository = bookingMolliePaymentRepository;
        this.molliePaymentRepository = molliePaymentRepository;
        this.statusEntryRepository = statusEntryRepository;
        this.portalMapper = portalMapper;
        this.mollieRestClient = mollieRestClient;
        this.mollieConfig = mollieConfig;
    }

    /** De betalingen van de boeking, elk met de huidige status (de laatste statusregel; zonder regel geldt "open"). */
    @Transactional(readOnly = true)
    public List<PortalPaymentDto> findPaymentsByBookingId(UUID bookingId) {
        List<MolliePayment> payments = bookingMolliePaymentRepository.findByBookingBookingId(bookingId).stream()
                .map(BookingMolliePayment::getMolliePayment)
                .toList();
        Map<UUID, MolliePaymentStatus> currentStatus = currentStatusByPayment(
                payments.stream().map(MolliePayment::getMolliePaymentId).toList());
        return payments.stream()
                .map(p -> portalMapper.toPaymentDto(p,
                        currentStatus.getOrDefault(p.getMolliePaymentId(), MolliePaymentStatus.OPEN)))
                .toList();
    }

    /** De statushistorie van de betalingen van de boeking: alleen status en tijdstip. */
    @Transactional(readOnly = true)
    public List<PortalPaymentStatusDto> findStatusEntriesByBookingId(UUID bookingId) {
        List<UUID> paymentIds = bookingMolliePaymentRepository.findByBookingBookingId(bookingId).stream()
                .map(bmp -> bmp.getMolliePayment().getMolliePaymentId())
                .toList();
        return statusEntryRepository.findByMolliePaymentMolliePaymentIdIn(paymentIds).stream()
                .map(portalMapper::toPaymentStatusDto)
                .toList();
    }

    private Map<UUID, MolliePaymentStatus> currentStatusByPayment(List<UUID> paymentIds) {
        return statusEntryRepository.findByMolliePaymentMolliePaymentIdIn(paymentIds).stream()
                .collect(Collectors.groupingBy(e -> e.getMolliePayment().getMolliePaymentId(),
                        Collectors.collectingAndThen(
                                Collectors.maxBy(Comparator.comparing(MolliePaymentStatusEntry::getCreatedAt,
                                        Comparator.nullsFirst(Comparator.naturalOrder()))),
                                latest -> latest.get().getStatus())));
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
