package nl.puurkroatie.rds.bookingstatus.service;

import nl.puurkroatie.rds.booking.entity.BookingMolliePayment;
import nl.puurkroatie.rds.booking.repository.BookingMolliePaymentRepository;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatus;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatusEntry;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentStatusEntryRepository;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** De betalingen van een boeking met hun huidige status (de laatste statusregel; statusregels worden alleen toegevoegd). */
@Component
public class PaymentStates {

    /** Een betaling met haar huidige status. */
    public record PaymentState(MolliePayment payment, MolliePaymentStatus status) {
    }

    private final BookingMolliePaymentRepository bookingMolliePaymentRepository;
    private final MolliePaymentStatusEntryRepository statusEntryRepository;

    public PaymentStates(BookingMolliePaymentRepository bookingMolliePaymentRepository,
                         MolliePaymentStatusEntryRepository statusEntryRepository) {
        this.bookingMolliePaymentRepository = bookingMolliePaymentRepository;
        this.statusEntryRepository = statusEntryRepository;
    }

    public List<PaymentState> ofBooking(UUID bookingId) {
        List<MolliePayment> payments = bookingMolliePaymentRepository.findByBookingBookingId(bookingId).stream()
                .map(BookingMolliePayment::getMolliePayment)
                .toList();
        if (payments.isEmpty()) {
            return List.of();
        }
        Map<UUID, MolliePaymentStatus> current = new HashMap<>();
        statusEntryRepository.findByMolliePaymentMolliePaymentIdIn(payments.stream().map(MolliePayment::getMolliePaymentId).toList())
                .stream()
                .sorted(Comparator.comparing(MolliePaymentStatusEntry::getCreatedAt, Comparator.nullsFirst(Comparator.naturalOrder())))
                .forEach(e -> current.put(e.getMolliePayment().getMolliePaymentId(), e.getStatus()));
        return payments.stream()
                .map(p -> new PaymentState(p, current.getOrDefault(p.getMolliePaymentId(), MolliePaymentStatus.OPEN)))
                .toList();
    }

    /** Of er van deze boeking iets betaald is. */
    public boolean anyPaid(UUID bookingId) {
        return ofBooking(bookingId).stream().anyMatch(s -> s.status() == MolliePaymentStatus.PAID);
    }
}
