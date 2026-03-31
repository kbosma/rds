package nl.puurkroatie.rds.booking.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import nl.puurkroatie.rds.common.Default;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class TravelerDto {

    private UUID travelerId;
    @NotNull
    private UUID bookingId;
    @NotNull
    @Size(max = 255)
    private String firstname;
    private String prefix;
    @NotNull
    @Size(max = 255)
    private String lastname;
    private String gender;
    private LocalDate birthdate;
    private String initials;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;
    private UUID tenantOrganization;

    @Default
    @JsonCreator
    public TravelerDto(UUID travelerId, UUID bookingId, String firstname, String prefix, String lastname, String gender, LocalDate birthdate, String initials, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.travelerId = travelerId;
        this.bookingId = bookingId;
        this.firstname = firstname;
        this.prefix = prefix;
        this.lastname = lastname;
        this.gender = gender;
        this.birthdate = birthdate;
        this.initials = initials;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public TravelerDto(UUID bookingId, String firstname, String prefix, String lastname, String gender, LocalDate birthdate, String initials, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.bookingId = bookingId;
        this.firstname = firstname;
        this.prefix = prefix;
        this.lastname = lastname;
        this.gender = gender;
        this.birthdate = birthdate;
        this.initials = initials;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public UUID getTravelerId() {
        return travelerId;
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public String getFirstname() {
        return firstname;
    }

    public String getPrefix() {
        return prefix;
    }

    public String getLastname() {
        return lastname;
    }

    public String getGender() {
        return gender;
    }

    public LocalDate getBirthdate() {
        return birthdate;
    }

    public String getInitials() {
        return initials;
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
