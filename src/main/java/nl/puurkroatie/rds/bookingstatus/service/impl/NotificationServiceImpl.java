package nl.puurkroatie.rds.bookingstatus.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.bookingstatus.dto.NotificationDto;
import nl.puurkroatie.rds.bookingstatus.entity.Notification;
import nl.puurkroatie.rds.bookingstatus.repository.NotificationRepository;
import nl.puurkroatie.rds.bookingstatus.service.BookingStatusEngine;
import nl.puurkroatie.rds.bookingstatus.service.NotificationService;
import nl.puurkroatie.rds.mollie.service.CreatedByNameResolver;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final BookingRepository bookingRepository;
    private final CreatedByNameResolver nameResolver;
    private final Clock clock;
    private final BookingStatusEngine statusEngine;

    public NotificationServiceImpl(NotificationRepository notificationRepository, BookingRepository bookingRepository,
                                   CreatedByNameResolver nameResolver, Clock clock, BookingStatusEngine statusEngine) {
        this.statusEngine = statusEngine;
        this.notificationRepository = notificationRepository;
        this.bookingRepository = bookingRepository;
        this.nameResolver = nameResolver;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationDto> findOpen() {
        List<Notification> open = isAdmin()
                ? notificationRepository.findByHandledFalseOrderByNotifiedAtDesc()
                : notificationRepository.findByTenantOrganizationAndHandledFalseOrderByNotifiedAtDesc(TenantContext.getOrganizationId());
        return toDtos(open);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationDto> findByBooking(UUID bookingId) {
        bookingRepository.findById(bookingId)
                .ifPresentOrElse(b -> verifyOrganization(b.getTenantOrganization()),
                        () -> { throw new RuntimeException("Booking not found with id: " + bookingId); });
        return toDtos(notificationRepository.findByBookingBookingIdOrderByNotifiedAtDesc(bookingId));
    }

    @Override
    public NotificationDto handle(UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found with id: " + notificationId));
        verifyOrganization(notification.getTenantOrganization());
        Notification result = notification;
        if (!notification.isHandled()) {
            result = notificationRepository.save(notification.handledBy(TenantContext.getAccountId(), LocalDateTime.now(clock)));
            // Was dit de laatste open notificatie van een boeking die weer thuis is, dan rondt de engine haar af.
            statusEngine.evaluate(notification.getBooking().getBookingId());
        }
        return toDtos(List.of(result)).get(0);
    }

    private List<NotificationDto> toDtos(List<Notification> notifications) {
        Map<UUID, String> names = nameResolver.resolve(notifications.stream().map(Notification::getHandledBy).toList());
        return notifications.stream()
                .map(n -> new NotificationDto(n.getNotificationId(), n.getBooking().getBookingId(), n.getBooking().getBookingNumber(),
                        n.getKind().toValue(), n.getTitle(), n.getNotifiedAt(), n.isHandled(), n.getHandledAt(), n.getHandledBy(),
                        names.get(n.getHandledBy())))
                .toList();
    }

    private static boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private static void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }
}
