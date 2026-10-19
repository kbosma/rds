package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.BookingMolliePaymentDto;
import nl.puurkroatie.rds.booking.dto.PaymentRelinkDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingMolliePaymentService {

    List<BookingMolliePaymentDto> findAll();

    Optional<BookingMolliePaymentDto> findById(UUID bookingId, UUID molliePaymentId);

    BookingMolliePaymentDto create(BookingMolliePaymentDto dto);

    List<BookingMolliePaymentDto> findByBookingId(UUID bookingId);

    /**
     * Koppelt een betaling aan een andere boeking, met reden. Een koppeling wordt nooit losgemaakt: dit registreert een
     * herkoppeling (wie, wanneer, van welke naar welke boeking, waarom) die alleen-toevoegen is.
     */
    PaymentRelinkDto relink(UUID molliePaymentId, UUID targetBookingId, String reason);

    /** De geregistreerde herkoppelingen van een betaling, oudste eerst. */
    List<PaymentRelinkDto> findRelinks(UUID molliePaymentId);
}
