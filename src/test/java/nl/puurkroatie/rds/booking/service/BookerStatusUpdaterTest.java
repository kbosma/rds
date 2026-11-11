package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.BookerStatus;
import nl.puurkroatie.rds.booking.entity.BookingStatus;
import nl.puurkroatie.rds.booking.repository.BookerRepository;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * De status van een boeker volgt uit zijn boekingen: geen boeking PROSPECT, een boeking die nog niet is afgerond
 * ACTIVE, alleen afgeronde boekingen NIETACTIEF. {@code refresh} slaat alleen op als de status echt verandert.
 */
@ExtendWith(MockitoExtension.class)
class BookerStatusUpdaterTest {

    private static final UUID BOOKER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Mock
    private BookerRepository bookerRepository;
    @Mock
    private BookingRepository bookingRepository;
    @InjectMocks
    private BookerStatusUpdater updater;

    private static Booker booker(BookerStatus status) {
        return new Booker(BOOKER_ID, "Jan", null, "Jansen", null, null, null, null, null, null, status, null, null, null);
    }

    @Test
    void withoutBookings_isProspect() {
        assertEquals(BookerStatus.PROSPECT, BookerStatusUpdater.derive(List.of()));
    }

    @Test
    void withABookingThatIsNotAfgerond_isActive() {
        assertEquals(BookerStatus.ACTIVE, BookerStatusUpdater.derive(List.of(BookingStatus.AFGEROND, BookingStatus.OFFERTE)));
    }

    @Test
    void withOnlyAfgerondBookings_isNietactief() {
        assertEquals(BookerStatus.NIETACTIEF, BookerStatusUpdater.derive(List.of(BookingStatus.AFGEROND, BookingStatus.AFGEROND)));
    }

    @Test
    void refresh_savesTheNewStatusWhenItChanges() {
        when(bookerRepository.findById(BOOKER_ID)).thenReturn(Optional.of(booker(BookerStatus.PROSPECT)));
        when(bookingRepository.findStatusesByBookerId(BOOKER_ID)).thenReturn(List.of(BookingStatus.AANVRAAG));

        updater.refresh(BOOKER_ID);

        ArgumentCaptor<Booker> saved = ArgumentCaptor.forClass(Booker.class);
        verify(bookerRepository).save(saved.capture());
        assertEquals(BookerStatus.ACTIVE, saved.getValue().getStatus());
        assertEquals(BOOKER_ID, saved.getValue().getBookerId());
    }

    @Test
    void refresh_doesNotSaveWhenTheStatusIsAlreadyRight() {
        when(bookerRepository.findById(BOOKER_ID)).thenReturn(Optional.of(booker(BookerStatus.ACTIVE)));
        when(bookingRepository.findStatusesByBookerId(BOOKER_ID)).thenReturn(List.of(BookingStatus.BOEKING));

        updater.refresh(BOOKER_ID);

        verify(bookerRepository, never()).save(any());
    }

    @Test
    void refresh_withoutBookerId_doesNothing() {
        updater.refresh(null);

        verifyNoInteractions(bookerRepository, bookingRepository);
    }

    @Test
    void refresh_forAnUnknownBooker_doesNothing() {
        when(bookerRepository.findById(BOOKER_ID)).thenReturn(Optional.empty());

        updater.refresh(BOOKER_ID);

        verify(bookerRepository, never()).save(any());
        verifyNoInteractions(bookingRepository);
    }
}
