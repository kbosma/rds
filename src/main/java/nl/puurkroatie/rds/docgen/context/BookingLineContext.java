package nl.puurkroatie.rds.docgen.context;

import java.math.BigDecimal;
import java.time.LocalDate;

public class BookingLineContext {

    private LocalDate fromDate;
    private LocalDate untilDate;
    private BigDecimal price;
    private AccommodationContext accommodation;
    private SupplierContext supplier;

    public BookingLineContext(LocalDate fromDate, LocalDate untilDate, BigDecimal price, AccommodationContext accommodation, SupplierContext supplier) {
        this.fromDate = fromDate;
        this.untilDate = untilDate;
        this.price = price;
        this.accommodation = accommodation;
        this.supplier = supplier;
    }

    public LocalDate getFromDate() {
        return fromDate;
    }

    public LocalDate getUntilDate() {
        return untilDate;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public AccommodationContext getAccommodation() {
        return accommodation;
    }

    public SupplierContext getSupplier() {
        return supplier;
    }
}
