package nl.puurkroatie.rds.bookerportal.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** De kerngegevens van de boeking zoals de klant ze in het portaal ziet (periode en totaal zijn afgeleid). */
public record PortalBookingDto(
        String bookingNumber,
        String status,
        LocalDate fromDate,
        LocalDate untilDate,
        BigDecimal totalSum) {
}
