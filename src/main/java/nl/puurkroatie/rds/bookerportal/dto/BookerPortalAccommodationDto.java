package nl.puurkroatie.rds.bookerportal.dto;

import java.time.LocalDate;
import java.util.UUID;

public class BookerPortalAccommodationDto {

    private UUID bookingLineId;
    private String accommodationName;
    private String supplierName;
    private LocalDate fromDate;
    private LocalDate untilDate;

    public BookerPortalAccommodationDto(UUID bookingLineId, String accommodationName,
                                        String supplierName, LocalDate fromDate, LocalDate untilDate) {
        this.bookingLineId = bookingLineId;
        this.accommodationName = accommodationName;
        this.supplierName = supplierName;
        this.fromDate = fromDate;
        this.untilDate = untilDate;
    }

    public UUID getBookingLineId() { return bookingLineId; }
    public String getAccommodationName() { return accommodationName; }
    public String getSupplierName() { return supplierName; }
    public LocalDate getFromDate() { return fromDate; }
    public LocalDate getUntilDate() { return untilDate; }
}
