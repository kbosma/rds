package nl.puurkroatie.rds.booking.dto;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class BookingDto {

    private UUID bookingId;
    private UUID bookerId;
    private String bookingNumber;
    private UUID bookingStatusId;
    private LocalDate fromDate;
    private LocalDate untilDate;
    private BigDecimal totalSum;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;
    private UUID tenantOrganization;

    @JsonCreator
    public BookingDto(UUID bookingId, UUID bookerId, String bookingNumber, UUID bookingStatusId, LocalDate fromDate, LocalDate untilDate, BigDecimal totalSum, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.bookingId = bookingId;
        this.bookerId = bookerId;
        this.bookingNumber = bookingNumber;
        this.bookingStatusId = bookingStatusId;
        this.fromDate = fromDate;
        this.untilDate = untilDate;
        this.totalSum = totalSum;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public BookingDto(UUID bookerId, String bookingNumber, UUID bookingStatusId, LocalDate fromDate, LocalDate untilDate, BigDecimal totalSum, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.bookerId = bookerId;
        this.bookingNumber = bookingNumber;
        this.bookingStatusId = bookingStatusId;
        this.fromDate = fromDate;
        this.untilDate = untilDate;
        this.totalSum = totalSum;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public UUID getBookerId() {
        return bookerId;
    }

    public String getBookingNumber() {
        return bookingNumber;
    }

    public UUID getBookingStatusId() {
        return bookingStatusId;
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
