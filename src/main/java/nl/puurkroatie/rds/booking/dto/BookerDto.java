package nl.puurkroatie.rds.booking.dto;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class BookerDto {

    private UUID bookerId;
    private UUID bookingId;
    private String firstname;
    private String prefix;
    private String lastname;
    private String callsign;
    private String telephone;
    private String emailaddress;
    private UUID genderId;
    private LocalDate birthdate;
    private String initials;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;
    private UUID tenantOrganization;

    @JsonCreator
    public BookerDto(UUID bookerId, UUID bookingId, String firstname, String prefix, String lastname, String callsign, String telephone, String emailaddress, UUID genderId, LocalDate birthdate, String initials, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.bookerId = bookerId;
        this.bookingId = bookingId;
        this.firstname = firstname;
        this.prefix = prefix;
        this.lastname = lastname;
        this.callsign = callsign;
        this.telephone = telephone;
        this.emailaddress = emailaddress;
        this.genderId = genderId;
        this.birthdate = birthdate;
        this.initials = initials;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public BookerDto(UUID bookingId, String firstname, String prefix, String lastname, String callsign, String telephone, String emailaddress, UUID genderId, LocalDate birthdate, String initials, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.bookingId = bookingId;
        this.firstname = firstname;
        this.prefix = prefix;
        this.lastname = lastname;
        this.callsign = callsign;
        this.telephone = telephone;
        this.emailaddress = emailaddress;
        this.genderId = genderId;
        this.birthdate = birthdate;
        this.initials = initials;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public UUID getBookerId() {
        return bookerId;
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

    public String getCallsign() {
        return callsign;
    }

    public String getTelephone() {
        return telephone;
    }

    public String getEmailaddress() {
        return emailaddress;
    }

    public UUID getGenderId() {
        return genderId;
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
