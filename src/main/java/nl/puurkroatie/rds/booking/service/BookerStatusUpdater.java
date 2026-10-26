package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.BookerStatus;
import nl.puurkroatie.rds.booking.entity.BookingStatus;
import nl.puurkroatie.rds.booking.repository.BookerRepository;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * De status van een booker wordt niet meer gekozen, maar volgt uit zijn boekingen:
 * <ul>
 *   <li>geen boeking: {@code PROSPECT} (zo begint elke nieuwe booker);</li>
 *   <li>minstens één boeking die nog niet is afgerond: {@code ACTIVE};</li>
 *   <li>alle boekingen afgerond: {@code NIETACTIEF}.</li>
 * </ul>
 * Aanroepen na elke wijziging die de boekingen van een booker raakt (aanmaken, koppelen, ontkoppelen, status,
 * verwijderen). De tenant-controle gebeurt door de aanroepende service.
 */
@Component
public class BookerStatusUpdater {

    private final BookerRepository bookerRepository;
    private final BookingRepository bookingRepository;

    public BookerStatusUpdater(BookerRepository bookerRepository, BookingRepository bookingRepository) {
        this.bookerRepository = bookerRepository;
        this.bookingRepository = bookingRepository;
    }

    public static BookerStatus derive(List<BookingStatus> bookingStatuses) {
        if (bookingStatuses.isEmpty()) {
            return BookerStatus.PROSPECT;
        }
        return bookingStatuses.stream().allMatch(s -> s == BookingStatus.AFGEROND)
                ? BookerStatus.NIETACTIEF
                : BookerStatus.ACTIVE;
    }

    /** Werkt de status van de booker bij; doet niets als die al klopt of als er geen booker is. */
    public void refresh(UUID bookerId) {
        if (bookerId == null) {
            return;
        }
        Booker booker = bookerRepository.findById(bookerId).orElse(null);
        if (booker == null) {
            return;
        }
        BookerStatus status = derive(bookingRepository.findStatusesByBookerId(bookerId));
        if (status != booker.getStatus()) {
            bookerRepository.save(booker.withStatus(status));
        }
    }
}
