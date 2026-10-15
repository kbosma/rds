package nl.puurkroatie.rds.booking.service;

import jakarta.persistence.EntityManager;
import nl.puurkroatie.rds.common.DeletionBlockedException;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Bewaakt dat niets wordt verwijderd waar geschiedenis aan hangt.
 *
 * Aangemaakte documenten en betalingen zijn "de waarheid": ze mogen niet verdwijnen. De database zou ze
 * echter stilletjes meeverwijderen (ON DELETE CASCADE) zodra de boeking, of iets waaraan de boeking hangt,
 * wordt verwijderd. Daarom weigert deze guard het verwijderen van:
 * <ul>
 *   <li>een boeking met documenten of betalingen;</li>
 *   <li>een booker, accommodatie, leverancier of activiteit die voorkomt in een boeking met documenten of
 *       betalingen.</li>
 * </ul>
 * Verzonden e-mails worden niet bewaard (er is geen e-mailgeschiedenis), dus daar valt niets te bewaken.
 *
 * Het gaat om de bestaande boekingen in de database; de tenant-controle gebeurt door de aanroepende service.
 */
@Component
public class DeletionGuard {

    private static final String HAS_HISTORY =
            "(exists (select d.documentId from Document d where d.booking = b)"
                    + " or exists (select p.booking from BookingMolliePayment p where p.booking = b))";

    private final EntityManager entityManager;

    public DeletionGuard(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public void verifyBookingDeletable(UUID bookingId) {
        verify("b.bookingId = :id", bookingId, "booking");
    }

    public void verifyBookerDeletable(UUID bookerId) {
        verify("b.booker.bookerId = :id", bookerId, "booker");
    }

    public void verifyAccommodationDeletable(UUID accommodationId) {
        verify("exists (select l.bookingLineId from BookingLine l where l.booking = b"
                + " and l.accommodation.accommodationId = :id)", accommodationId, "accommodation");
    }

    public void verifySupplierDeletable(UUID supplierId) {
        verify("exists (select l.bookingLineId from BookingLine l where l.booking = b"
                + " and l.supplier.supplierId = :id)", supplierId, "supplier");
    }

    public void verifyActivityDeletable(UUID activityId) {
        verify("exists (select a.bookingActivityId from BookingActivity a where a.booking = b"
                + " and a.activity.activityId = :id)", activityId, "activity");
    }

    private void verify(String bookingCondition, UUID id, String what) {
        Long linked = entityManager.createQuery(
                        "select count(b) from Booking b where " + bookingCondition + " and " + HAS_HISTORY, Long.class)
                .setParameter("id", id)
                .getSingleResult();
        if (linked != null && linked > 0) {
            throw new DeletionBlockedException("This " + what + " cannot be deleted: it is linked to "
                    + linked + (linked == 1 ? " booking" : " bookings")
                    + " that has documents or payments, which must be kept as history.");
        }
    }
}
