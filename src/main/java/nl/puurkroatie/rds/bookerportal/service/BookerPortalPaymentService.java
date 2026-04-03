package nl.puurkroatie.rds.bookerportal.service;

import nl.puurkroatie.rds.booking.entity.BookingMolliePayment;
import nl.puurkroatie.rds.booking.repository.BookingMolliePaymentRepository;
import nl.puurkroatie.rds.mollie.config.MollieConfig;
import nl.puurkroatie.rds.mollie.dto.MolliePaymentDto;
import nl.puurkroatie.rds.mollie.dto.MolliePaymentStatusEntryDto;
import nl.puurkroatie.rds.mollie.dto.PaymentRequestDto;
import nl.puurkroatie.rds.mollie.dto.PaymentResponseDto;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatus;
import nl.puurkroatie.rds.mollie.mapper.MolliePaymentMapper;
import nl.puurkroatie.rds.mollie.mapper.MolliePaymentStatusEntryMapper;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentRepository;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentStatusEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class BookerPortalPaymentService {

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

    public PaymentResponseDto initiatePayment(UUID molliePaymentId, UUID bookingId) {
        // Verify payment belongs to this booking
        boolean belongs = bookingMolliePaymentRepository.findByBookingBookingId(bookingId).stream()
                .anyMatch(bmp -> bmp.getMolliePayment().getMolliePaymentId().equals(molliePaymentId));

        if (!belongs) {
            throw new IllegalArgumentException("Payment does not belong to this booking");
        }

        MolliePayment payment = molliePaymentRepository.findById(molliePaymentId)
                .orElseThrow(() -> new RuntimeException("MolliePayment not found: " + molliePaymentId));

        // Build Mollie API request from existing payment data
        PaymentRequestDto request = new PaymentRequestDto(
                new PaymentRequestDto.Amount(payment.getCurrency(), payment.getAmount().toPlainString()),
                payment.getDescription(),
                mollieConfig.getUrls().getRedirect(),
                mollieConfig.getUrls().getWebhook(),
                null
        );

        PaymentResponseDto response = mollieRestClient.post()
                .body(request)
                .retrieve()
                .body(PaymentResponseDto.class);

        if (response != null && response.getId() != null) {
            String checkoutUrl = response.getLinks() != null && response.getLinks().getCheckout() != null
                    ? response.getLinks().getCheckout().getHref()
                    : null;
            MolliePaymentStatus status = response.getStatus() != null
                    ? MolliePaymentStatus.fromValue(response.getStatus())
                    : null;

            // Update existing payment with Mollie external ID, checkout URL and status
            MolliePayment updated = new MolliePayment(
                    payment.getMolliePaymentId(),
                    response.getId(),
                    status,
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
