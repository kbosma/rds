package nl.puurkroatie.rds.booking.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import nl.puurkroatie.rds.booking.entity.Booking;

/** Implementatie van {@link BookingRepositoryCustom}; Spring Data koppelt hem aan {@link BookingRepository}. */
public class BookingRepositoryCustomImpl implements BookingRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Booking saveAndRefresh(Booking booking) {
        Booking managed = entityManager.merge(booking);
        entityManager.flush();
        entityManager.refresh(managed);
        return managed;
    }
}
