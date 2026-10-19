package nl.puurkroatie.rds.booking.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import nl.puurkroatie.rds.common.DeletionBlockedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Documenten en betalingen zijn geschiedenis. De guard weigert het verwijderen van alles waaraan zo'n
 * boeking hangt; de database zou ze anders stilletjes meeverwijderen (ON DELETE CASCADE).
 */
@ExtendWith(MockitoExtension.class)
class DeletionGuardTest {

    private static final UUID ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Mock
    private EntityManager entityManager;
    @Mock
    private TypedQuery<Long> query;

    private DeletionGuard guard;

    @BeforeEach
    void setUp() {
        guard = new DeletionGuard(entityManager);
        when(entityManager.createQuery(anyString(), eq(Long.class))).thenReturn(query);
        when(query.setParameter(eq("id"), eq(ID))).thenReturn(query);
    }

    private String jpql() {
        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(entityManager).createQuery(captor.capture(), eq(Long.class));
        return captor.getValue();
    }

    @Test
    void aBookingWithoutDocumentsOrPayments_mayBeDeleted() {
        when(query.getSingleResult()).thenReturn(0L);

        assertDoesNotThrow(() -> guard.verifyBookingDeletable(ID));
    }

    @Test
    void aBookingWithDocumentsOrPayments_isRefused_withAClearMessage() {
        when(query.getSingleResult()).thenReturn(1L);

        DeletionBlockedException ex = assertThrows(DeletionBlockedException.class, () -> guard.verifyBookingDeletable(ID));

        assertTrue(ex.getMessage().contains("booking"), ex.getMessage());
        assertTrue(ex.getMessage().contains("documents, payments or sent emails"), ex.getMessage());
        assertTrue(ex.getMessage().contains("1 booking"), ex.getMessage());
    }

    @Test
    void theMessageCountsSeveralBookings() {
        when(query.getSingleResult()).thenReturn(3L);

        DeletionBlockedException ex = assertThrows(DeletionBlockedException.class, () -> guard.verifyBookerDeletable(ID));

        assertTrue(ex.getMessage().contains("3 bookings"), ex.getMessage());
        assertTrue(ex.getMessage().startsWith("This booker"), ex.getMessage());
    }

    @Test
    void theQueryLooksAtBothDocumentsAndPayments() {
        when(query.getSingleResult()).thenReturn(0L);

        guard.verifyBookingDeletable(ID);

        String jpql = jpql();
        assertTrue(jpql.contains("Document d where d.booking = b"), jpql);
        assertTrue(jpql.contains("BookingMolliePayment p where p.booking = b"), jpql);
        assertTrue(jpql.contains("b.bookingId = :id"), jpql);
    }

    @Test
    void eachKindIsCheckedThroughItsOwnLink() {
        when(query.getSingleResult()).thenReturn(0L);

        guard.verifyBookerDeletable(ID);
        guard.verifyAccommodationDeletable(ID);
        guard.verifySupplierDeletable(ID);
        guard.verifyActivityDeletable(ID);

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(entityManager, org.mockito.Mockito.times(4)).createQuery(captor.capture(), eq(Long.class));
        assertTrue(captor.getAllValues().get(0).contains("b.booker.bookerId = :id"));
        assertTrue(captor.getAllValues().get(1).contains("l.accommodation.accommodationId = :id"));
        assertTrue(captor.getAllValues().get(2).contains("l.supplier.supplierId = :id"));
        assertTrue(captor.getAllValues().get(3).contains("a.activity.activityId = :id"));
    }

    @Test
    void aNullCount_isTreatedAsNothingLinked() {
        when(query.getSingleResult()).thenReturn(null);

        assertDoesNotThrow(() -> guard.verifyActivityDeletable(ID));
    }
}
