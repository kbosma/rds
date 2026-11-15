package nl.puurkroatie.rds.bookingstatus.repository;

import nl.puurkroatie.rds.bookingstatus.entity.Notification;
import nl.puurkroatie.rds.bookingstatus.entity.NotificationKind;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByBookingBookingIdOrderByNotifiedAtDesc(UUID bookingId);

    List<Notification> findByTenantOrganizationAndHandledFalseOrderByNotifiedAtDesc(UUID tenantOrganization);

    List<Notification> findByHandledFalseOrderByNotifiedAtDesc();

    boolean existsByBookingBookingIdAndKindAndHandledFalse(UUID bookingId, NotificationKind kind);

    boolean existsByBookingBookingIdAndHandledFalse(UUID bookingId);
}
