package nl.puurkroatie.rds.bookingstatus.service;

import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.BookingStatus;
import nl.puurkroatie.rds.bookingstatus.entity.BookingStatusChange;
import nl.puurkroatie.rds.bookingstatus.repository.BookingStatusChangeRepository;
import org.springframework.stereotype.Component;

/** Legt een statuswijziging vast in de statusgeschiedenis (alleen-toevoegen). Doet niets als de status gelijk blijft. */
@Component
public class BookingStatusRecorder {

    private final BookingStatusChangeRepository repository;

    public BookingStatusRecorder(BookingStatusChangeRepository repository) {
        this.repository = repository;
    }

    public void record(Booking booking, BookingStatus from, BookingStatus to, boolean automatic, String reason) {
        if (from == to) {
            return;
        }
        repository.save(new BookingStatusChange(booking, from, to, automatic, reason));
    }
}
