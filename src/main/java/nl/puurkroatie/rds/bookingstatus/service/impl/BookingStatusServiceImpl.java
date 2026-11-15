package nl.puurkroatie.rds.bookingstatus.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.BookingDto;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.BookingStatus;
import nl.puurkroatie.rds.booking.mapper.BookingMapper;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.service.BookerStatusUpdater;
import nl.puurkroatie.rds.bookingstatus.dto.BookingStatusChangeDto;
import nl.puurkroatie.rds.bookingstatus.entity.BookingStatusChange;
import nl.puurkroatie.rds.bookingstatus.repository.BookingStatusChangeRepository;
import nl.puurkroatie.rds.bookingstatus.service.BookingStatusRecorder;
import nl.puurkroatie.rds.bookingstatus.service.BookingStatusService;
import nl.puurkroatie.rds.bookingstatus.service.PaymentStates;
import nl.puurkroatie.rds.mollie.service.CreatedByNameResolver;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class BookingStatusServiceImpl implements BookingStatusService {

    static final String REVERT_PAID_AUTHORITY = "BOOKING_STATUS_REVERT_PAID";
    /** Terug naar een status van vóór de bevestiging maakt de bevestiging ongedaan. */
    private static final Set<BookingStatus> UNCONFIRMED = EnumSet.of(BookingStatus.AANVRAAG, BookingStatus.OFFERTE);

    private final BookingRepository bookingRepository;
    private final BookingMapper bookingMapper;
    private final BookingStatusRecorder recorder;
    private final BookingStatusChangeRepository changeRepository;
    private final PaymentStates paymentStates;
    private final BookerStatusUpdater bookerStatusUpdater;
    private final CreatedByNameResolver nameResolver;

    public BookingStatusServiceImpl(BookingRepository bookingRepository, BookingMapper bookingMapper,
                                    BookingStatusRecorder recorder, BookingStatusChangeRepository changeRepository,
                                    PaymentStates paymentStates, BookerStatusUpdater bookerStatusUpdater,
                                    CreatedByNameResolver nameResolver) {
        this.bookingRepository = bookingRepository;
        this.bookingMapper = bookingMapper;
        this.recorder = recorder;
        this.changeRepository = changeRepository;
        this.paymentStates = paymentStates;
        this.bookerStatusUpdater = bookerStatusUpdater;
        this.nameResolver = nameResolver;
    }

    @Override
    public BookingDto revert(UUID bookingId, String targetStatus, String reason) {
        Booking booking = load(bookingId);
        BookingStatus current = booking.getBookingStatus();
        BookingStatus target = BookingStatus.fromValue(targetStatus);
        if (target.ordinal() >= current.ordinal()) {
            throw new IllegalArgumentException("Terugzetten kan alleen naar een eerdere status dan " + current.toValue());
        }
        if (paymentStates.anyPaid(bookingId) && !hasAuthority(REVERT_PAID_AUTHORITY)) {
            throw new AccessDeniedException("Er is al betaald: alleen een manager kan de status terugzetten");
        }
        Booking changed = UNCONFIRMED.contains(target) ? booking.withStatusUnconfirmed(target) : booking.withStatus(target);
        Booking saved = bookingRepository.saveAndRefresh(changed);
        recorder.record(saved, current, target, false, reason.trim());
        refreshBooker(saved);
        return bookingMapper.toDto(saved);
    }

    @Override
    public BookingDto complete(UUID bookingId, String reason) {
        Booking booking = load(bookingId);
        BookingStatus current = booking.getBookingStatus();
        if (current == BookingStatus.AFGEROND) {
            throw new IllegalArgumentException("De boeking is al afgerond");
        }
        Booking saved = bookingRepository.saveAndRefresh(booking.withStatus(BookingStatus.AFGEROND));
        String why = reason == null || reason.trim().length() < 5 ? "Afgerond door een medewerker" : reason.trim();
        recorder.record(saved, current, BookingStatus.AFGEROND, false, why);
        refreshBooker(saved);
        return bookingMapper.toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingStatusChangeDto> history(UUID bookingId) {
        load(bookingId);
        List<BookingStatusChange> changes = changeRepository.findByBookingBookingIdOrderByCreatedAtDesc(bookingId);
        Map<UUID, String> names = nameResolver.resolve(changes.stream().map(BookingStatusChange::getCreatedBy).toList());
        return changes.stream()
                .map(c -> new BookingStatusChangeDto(c.getBookingStatusChangeId(), bookingId, c.getFromStatus().toValue(),
                        c.getToStatus().toValue(), c.isAutomatic(), c.getReason(), c.getCreatedAt(), c.getCreatedBy(),
                        names.get(c.getCreatedBy())))
                .toList();
    }

    private Booking load(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));
        if (!TenantContext.hasRole("ADMIN") && !booking.getTenantOrganization().equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
        return booking;
    }

    private void refreshBooker(Booking booking) {
        if (booking.getBooker() != null) {
            bookerStatusUpdater.refresh(booking.getBooker().getBookerId());
        }
    }

    private static boolean hasAuthority(String authority) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> authority.equals(a.getAuthority()));
    }
}
