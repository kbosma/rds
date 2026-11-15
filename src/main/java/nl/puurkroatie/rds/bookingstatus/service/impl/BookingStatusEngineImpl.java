package nl.puurkroatie.rds.bookingstatus.service.impl;

import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.BookingStatus;
import nl.puurkroatie.rds.booking.repository.BookingLineRepository;
import nl.puurkroatie.rds.booking.repository.BookingMolliePaymentRepository;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.service.BookerStatusUpdater;
import nl.puurkroatie.rds.bookingstatus.entity.Notification;
import nl.puurkroatie.rds.bookingstatus.entity.NotificationKind;
import nl.puurkroatie.rds.bookingstatus.repository.NotificationRepository;
import nl.puurkroatie.rds.bookingstatus.service.BookingStatusEngine;
import nl.puurkroatie.rds.bookingstatus.service.BookingStatusRecorder;
import nl.puurkroatie.rds.bookingstatus.service.PaymentStates;
import nl.puurkroatie.rds.bookingstatus.service.StatusTarget;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatus;
import nl.puurkroatie.rds.mollie.entity.PaymentType;
import nl.puurkroatie.rds.mollie.event.PaymentStatusRecordedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class BookingStatusEngineImpl implements BookingStatusEngine {

    private static final Logger log = LoggerFactory.getLogger(BookingStatusEngineImpl.class);
    private static final Set<PaymentType> PLANNED = EnumSet.of(PaymentType.VOORSCHOT, PaymentType.RESTANT, PaymentType.DEFINITIEF);
    /** Mislukte, geannuleerde en verlopen betalingen tellen niet mee (ze worden vervangen door een nieuwe poging). */
    private static final Set<MolliePaymentStatus> NOT_COUNTED = EnumSet.of(
            MolliePaymentStatus.FAILED, MolliePaymentStatus.CANCELED, MolliePaymentStatus.EXPIRED);

    private final BookingRepository bookingRepository;
    private final BookingLineRepository bookingLineRepository;
    private final BookingMolliePaymentRepository bookingMolliePaymentRepository;
    private final PaymentStates paymentStates;
    private final NotificationRepository notificationRepository;
    private final BookingStatusRecorder recorder;
    private final BookerStatusUpdater bookerStatusUpdater;
    private final Clock clock;

    public BookingStatusEngineImpl(BookingRepository bookingRepository,
                                   BookingLineRepository bookingLineRepository,
                                   BookingMolliePaymentRepository bookingMolliePaymentRepository,
                                   PaymentStates paymentStates,
                                   NotificationRepository notificationRepository,
                                   BookingStatusRecorder recorder,
                                   BookerStatusUpdater bookerStatusUpdater,
                                   Clock clock) {
        this.bookingRepository = bookingRepository;
        this.bookingLineRepository = bookingLineRepository;
        this.bookingMolliePaymentRepository = bookingMolliePaymentRepository;
        this.paymentStates = paymentStates;
        this.notificationRepository = notificationRepository;
        this.recorder = recorder;
        this.bookerStatusUpdater = bookerStatusUpdater;
        this.clock = clock;
    }

    /** Direct na een nieuwe betaalstatus (webhook of correctie), in dezelfde transactie. */
    @EventListener
    public void onPaymentStatusRecorded(PaymentStatusRecordedEvent event) {
        bookingMolliePaymentRepository.findByMolliePaymentMolliePaymentId(event.molliePaymentId())
                .ifPresent(link -> evaluate(link.getBooking().getBookingId()));
    }

    @Override
    public void evaluate(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null || !StatusTarget.ENGINE_STATUSES.contains(booking.getBookingStatus())) {
            return;
        }
        BookingStatus current = booking.getBookingStatus();
        LocalDate today = LocalDate.now(clock);
        BookingStatus target = StatusTarget.of(current, paidPerRelevantPayment(bookingId),
                bookingLineRepository.firstFromDateByBookingId(bookingId),
                bookingLineRepository.lastUntilDateByBookingId(bookingId), today);
        Booking result = booking;
        if (target != current) {
            result = bookingRepository.saveAndRefresh(booking.withStatus(target));
            recorder.record(result, current, target, true, reason(current, target));
            notify(result, current, target);
            log.info("Status van boeking {}: {} -> {}", result.getBookingNumber(), current, target);
        }
        completeIfDone(result);
    }

    /**
     * Stap 5: een boeking die weer thuis is en geen openstaande notificaties meer heeft, is klaar en wordt AFGEROND.
     * De WEER_THUIS-notificatie zelf moet dus eerst afgehandeld zijn.
     */
    private void completeIfDone(Booking booking) {
        if (booking.getBookingStatus() != BookingStatus.WEERTHUIS
                || notificationRepository.existsByBookingBookingIdAndHandledFalse(booking.getBookingId())) {
            return;
        }
        Booking completed = bookingRepository.saveAndRefresh(booking.withStatus(BookingStatus.AFGEROND));
        recorder.record(completed, BookingStatus.WEERTHUIS, BookingStatus.AFGEROND, true,
                "Systeem: weer thuis en alle meldingen afgehandeld");
        if (completed.getBooker() != null) {
            bookerStatusUpdater.refresh(completed.getBooker().getBookerId());
        }
        log.info("Boeking {} automatisch afgerond", completed.getBookingNumber());
    }

    @Override
    public void evaluateOrganization(UUID organizationId) {
        bookingRepository.findIdsByTenantOrganizationAndBookingStatusIn(organizationId, StatusTarget.ENGINE_STATUSES)
                .forEach(this::evaluate);
    }

    @Override
    public void evaluateAll() {
        bookingRepository.findIdsByBookingStatusIn(StatusTarget.ENGINE_STATUSES).forEach(this::evaluate);
    }

    private List<Boolean> paidPerRelevantPayment(UUID bookingId) {
        List<PaymentStates.PaymentState> states = paymentStates.ofBooking(bookingId);
        List<PaymentStates.PaymentState> planned = states.stream()
                .filter(s -> PLANNED.contains(s.payment().getPaymentType()))
                .toList();
        return (planned.isEmpty() ? states : planned).stream()
                .map(PaymentStates.PaymentState::status)
                .filter(status -> !NOT_COUNTED.contains(status))
                .map(status -> status == MolliePaymentStatus.PAID)
                .toList();
    }

    private static String reason(BookingStatus from, BookingStatus to) {
        if (to.ordinal() < from.ordinal()) {
            return "Systeem: een betaling is niet meer betaald (terugboeking of correctie)";
        }
        return switch (to) {
            case VOORSCHOT -> "Systeem: voorschot betaald";
            case BETAALD -> "Systeem: alles betaald";
            case OPREIS -> "Systeem: vertrekdatum bereikt";
            case WEERTHUIS -> "Systeem: terugkeerdatum voorbij";
            default -> "Systeem: status bijgewerkt";
        };
    }

    private void notify(Booking booking, BookingStatus from, BookingStatus to) {
        LocalDateTime now = LocalDateTime.now(clock);
        if (to.ordinal() < from.ordinal()) {
            create(booking, NotificationKind.TERUGBOEKING, "Betaling teruggedraaid: status terug naar " + label(to), now);
            return;
        }
        if (passed(from, to, BookingStatus.BETAALD)) {
            create(booking, NotificationKind.ALLES_BETAALD, "Alles betaald: de reisgegevens kunnen verstuurd worden", now);
        }
        if (passed(from, to, BookingStatus.OPREIS)) {
            create(booking, NotificationKind.OP_REIS, "Op reis", now);
        }
        if (passed(from, to, BookingStatus.WEERTHUIS)) {
            create(booking, NotificationKind.WEER_THUIS, "Weer thuis", now);
        }
    }

    private static boolean passed(BookingStatus from, BookingStatus to, BookingStatus milestone) {
        return from.ordinal() < milestone.ordinal() && to.ordinal() >= milestone.ordinal();
    }

    private void create(Booking booking, NotificationKind kind, String title, LocalDateTime at) {
        if (!notificationRepository.existsByBookingBookingIdAndKindAndHandledFalse(booking.getBookingId(), kind)) {
            notificationRepository.save(new Notification(booking, kind, title + " (" + booking.getBookingNumber() + ")", at));
        }
    }

    private static String label(BookingStatus status) {
        return switch (status) {
            case BOEKING -> "Boeking";
            case VOORSCHOT -> "Voorschot";
            case BETAALD -> "Betaald";
            case OPREIS -> "Op reis";
            default -> status.name();
        };
    }
}
