package nl.puurkroatie.rds.paymentplan.service.impl;

import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.BookingMolliePayment;
import nl.puurkroatie.rds.booking.repository.BookingActivityRepository;
import nl.puurkroatie.rds.booking.repository.BookingLineRepository;
import nl.puurkroatie.rds.booking.repository.BookingMolliePaymentRepository;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.email.service.EmailSendService;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import nl.puurkroatie.rds.mollie.entity.PaymentType;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentRepository;
import nl.puurkroatie.rds.mollie.service.MolliePaymentStatusEntryService;
import nl.puurkroatie.rds.paymentplan.service.PaymentPlan;
import nl.puurkroatie.rds.paymentplan.service.PaymentPlanService;
import nl.puurkroatie.rds.settings.entity.OrganizationSettings;
import nl.puurkroatie.rds.settings.service.OrganizationSettingsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class PaymentPlanServiceImpl implements PaymentPlanService {

    private static final Logger log = LoggerFactory.getLogger(PaymentPlanServiceImpl.class);
    private static final String CURRENCY = "EUR";
    /** Soorten die het systeem maakt; OVERIG legt een medewerker zelf vast. */
    private static final Set<PaymentType> PLANNED = EnumSet.of(PaymentType.VOORSCHOT, PaymentType.RESTANT, PaymentType.DEFINITIEF);
    private static final Set<PaymentType> BALANCE = EnumSet.of(PaymentType.RESTANT, PaymentType.DEFINITIEF);
    private static final Map<PaymentType, String> DESCRIPTION = Map.of(
            PaymentType.VOORSCHOT, "Voorschot",
            PaymentType.RESTANT, "Restant",
            PaymentType.DEFINITIEF, "Betaling");

    private final BookingRepository bookingRepository;
    private final BookingLineRepository bookingLineRepository;
    private final BookingActivityRepository bookingActivityRepository;
    private final BookingMolliePaymentRepository bookingMolliePaymentRepository;
    private final MolliePaymentRepository molliePaymentRepository;
    private final MolliePaymentStatusEntryService statusEntryService;
    private final OrganizationSettingsService settingsService;
    private final EmailSendService emailSendService;
    private final Clock clock;

    public PaymentPlanServiceImpl(BookingRepository bookingRepository,
                                  BookingLineRepository bookingLineRepository,
                                  BookingActivityRepository bookingActivityRepository,
                                  BookingMolliePaymentRepository bookingMolliePaymentRepository,
                                  MolliePaymentRepository molliePaymentRepository,
                                  MolliePaymentStatusEntryService statusEntryService,
                                  OrganizationSettingsService settingsService,
                                  EmailSendService emailSendService,
                                  Clock clock) {
        this.bookingRepository = bookingRepository;
        this.bookingLineRepository = bookingLineRepository;
        this.bookingActivityRepository = bookingActivityRepository;
        this.bookingMolliePaymentRepository = bookingMolliePaymentRepository;
        this.molliePaymentRepository = molliePaymentRepository;
        this.statusEntryService = statusEntryService;
        this.settingsService = settingsService;
        this.emailSendService = emailSendService;
        this.clock = clock;
    }

    @Override
    public void createFor(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));
        if (plannedPayments(bookingId).stream().findAny().isPresent()) {
            return;
        }
        OrganizationSettings settings = settingsService.forOrganization(booking.getTenantOrganization());
        List<PaymentPlan.Planned> plan;
        try {
            plan = PaymentPlan.calculate(total(bookingId), bookingLineRepository.firstFromDateByBookingId(bookingId),
                    LocalDate.now(clock), settings.getDepositPercentage(), settings.getDepositWeeksBeforeDeparture(),
                    settings.getBalanceWeeksBeforeDeparture());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Bevestigen kan pas als de boeking een verblijf met een prijs heeft: "
                    + e.getMessage(), e);
        }

        for (PaymentPlan.Planned planned : plan) {
            MolliePayment payment = molliePaymentRepository.save(MolliePayment.planned(planned.type(), planned.amount(),
                    CURRENCY, DESCRIPTION.get(planned.type()) + " " + booking.getBookingNumber(), planned.dueDate(),
                    booking.getTenantOrganization()));
            statusEntryService.createInitialStatus(payment.getMolliePaymentId());
            bookingMolliePaymentRepository.save(new BookingMolliePayment(booking, payment));
        }
        bookingMolliePaymentRepository.flush();

        if (settings.getPaymentEmailTemplateId() != null) {
            emailSendService.sendForBooking(settings.getPaymentEmailTemplateId(), bookingId);
        } else {
            log.info("Geen betaalmail gekozen voor organisatie {}: betalingen van boeking {} zonder mail aangemaakt",
                    booking.getTenantOrganization(), booking.getBookingNumber());
        }
    }

    @Override
    public void recalculateBalance(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null || !booking.isQuoteConfirmed()) {
            return;
        }
        List<MolliePayment> planned = plannedPayments(bookingId);
        MolliePayment balance = planned.stream().filter(p -> BALANCE.contains(p.getPaymentType())).findFirst().orElse(null);
        if (balance == null || balance.isAtMollie()) {
            return;
        }
        BigDecimal deposits = planned.stream()
                .filter(p -> p.getPaymentType() == PaymentType.VOORSCHOT)
                .map(MolliePayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal newAmount = total(bookingId).subtract(deposits);
        if (newAmount.signum() <= 0) {
            log.warn("Restant van boeking {} zou {} worden; bedrag blijft {}", booking.getBookingNumber(), newAmount,
                    balance.getAmount());
            return;
        }
        if (newAmount.compareTo(balance.getAmount()) != 0) {
            molliePaymentRepository.save(balance.withAmount(newAmount));
        }
    }

    private BigDecimal total(UUID bookingId) {
        return bookingLineRepository.sumPriceByBookingId(bookingId)
                .add(bookingActivityRepository.sumTotalPriceByBookingId(bookingId));
    }

    private List<MolliePayment> plannedPayments(UUID bookingId) {
        return bookingMolliePaymentRepository.findByBookingBookingId(bookingId).stream()
                .map(BookingMolliePayment::getMolliePayment)
                .filter(p -> PLANNED.contains(p.getPaymentType()))
                .toList();
    }
}
