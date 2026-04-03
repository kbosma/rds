package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.repository.BookingRepository;
import org.springframework.stereotype.Service;

import java.time.Year;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class BookingNumberGenerator {

    private static final int MAX_ATTEMPTS = 10;

    private final BookingRepository bookingRepository;

    public BookingNumberGenerator(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    public synchronized String generate() {
        int year = Year.now().getValue();

        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            int random = ThreadLocalRandom.current().nextInt(10000, 100000);
            String bookingNumber = String.format("BK-%d-%05d", year, random);

            if (!bookingRepository.existsByBookingNumber(bookingNumber)) {
                return bookingNumber;
            }
        }

        throw new IllegalStateException("Could not generate a unique booking number after " + MAX_ATTEMPTS + " attempts");
    }
}
