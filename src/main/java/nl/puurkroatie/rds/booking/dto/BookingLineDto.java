package nl.puurkroatie.rds.booking.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class BookingLineDto {

    private UUID bookingLineId;

    @NotNull
    private UUID bookingId;
    @NotNull
    private UUID accommodationId;
    @NotNull
    private UUID supplierId;

    private String accommodationName;
    private String supplierName;

    private LocalDate fromDate;
    private LocalDate untilDate;
    private BigDecimal price;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;
    private UUID tenantOrganization;

    public BookingLineDto(UUID bookingLineId, UUID bookingId, UUID accommodationId, UUID supplierId,
                          String accommodationName, String supplierName,
                          LocalDate fromDate, LocalDate untilDate, BigDecimal price,
                          LocalDateTime createdAt, UUID createdBy,
                          LocalDateTime modifiedAt, UUID modifiedBy,
                          UUID tenantOrganization) {
        this.bookingLineId = bookingLineId;
        this.bookingId = bookingId;
        this.accommodationId = accommodationId;
        this.supplierId = supplierId;
        this.accommodationName = accommodationName;
        this.supplierName = supplierName;
        this.fromDate = fromDate;
        this.untilDate = untilDate;
        this.price = price;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public UUID getBookingLineId() {
        return bookingLineId;
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public UUID getAccommodationId() {
        return accommodationId;
    }

    public UUID getSupplierId() {
        return supplierId;
    }

    public String getAccommodationName() {
        return accommodationName;
    }

    public String getSupplierName() {
        return supplierName;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public LocalDateTime getModifiedAt() {
        return modifiedAt;
    }

    public UUID getModifiedBy() {
        return modifiedBy;
    }

    public UUID getTenantOrganization() {
        return tenantOrganization;
    }
}
