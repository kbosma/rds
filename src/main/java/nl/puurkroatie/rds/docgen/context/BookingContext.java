package nl.puurkroatie.rds.docgen.context;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class BookingContext {

    private String bookingNumber;
    private String bookingStatus;
    private LocalDate fromDate;
    private LocalDate untilDate;
    private BigDecimal totalSum;
    private BookerContext booker;
    private List<TravelerContext> travelers;
    private List<BookingLineContext> bookingLines;
    private List<BookingActivityContext> bookingActivities;

    public BookingContext(String bookingNumber, String bookingStatus, LocalDate fromDate, LocalDate untilDate, BigDecimal totalSum, BookerContext booker, List<TravelerContext> travelers, List<BookingLineContext> bookingLines, List<BookingActivityContext> bookingActivities) {
        this.bookingNumber = bookingNumber;
        this.bookingStatus = bookingStatus;
        this.fromDate = fromDate;
        this.untilDate = untilDate;
        this.totalSum = totalSum;
        this.booker = booker;
        this.travelers = travelers;
        this.bookingLines = bookingLines;
        this.bookingActivities = bookingActivities;
    }

    public String getBookingNumber() {
        return bookingNumber;
    }

    public String getBookingStatus() {
        return bookingStatus;
    }

    public LocalDate getFromDate() {
        return fromDate;
    }

    public LocalDate getUntilDate() {
        return untilDate;
    }

    public BigDecimal getTotalSum() {
        return totalSum;
    }

    public BookerContext getBooker() {
        return booker;
    }

    public List<TravelerContext> getTravelers() {
        return travelers;
    }

    public List<BookingLineContext> getBookingLines() {
        return bookingLines;
    }

    public List<BookingActivityContext> getBookingActivities() {
        return bookingActivities;
    }
}
