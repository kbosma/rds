package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.repository.BookingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Year;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingNumberGeneratorTest {

    @Mock
    private BookingRepository bookingRepository;

    @InjectMocks
    private BookingNumberGenerator bookingNumberGenerator;

    @Test
    void generate_returnsCorrectFormat() {
        when(bookingRepository.existsByBookingNumber(anyString())).thenReturn(false);

        String result = bookingNumberGenerator.generate();

        assertNotNull(result);
        assertTrue(result.matches("BK-\\d{4}-\\d{5}"), "Expected format BK-YYYY-NNNNN but got: " + result);
        assertTrue(result.startsWith("BK-" + Year.now().getValue() + "-"));
    }

    @Test
    void generate_retriesOnCollision() {
        when(bookingRepository.existsByBookingNumber(anyString()))
                .thenReturn(true)
                .thenReturn(true)
                .thenReturn(false);

        String result = bookingNumberGenerator.generate();

        assertNotNull(result);
        assertTrue(result.matches("BK-\\d{4}-\\d{5}"));
    }

    @Test
    void generate_throwsAfterMaxAttempts() {
        when(bookingRepository.existsByBookingNumber(anyString())).thenReturn(true);

        assertThrows(IllegalStateException.class, () -> bookingNumberGenerator.generate());
    }
}
