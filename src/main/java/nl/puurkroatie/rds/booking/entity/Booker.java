package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;


import nl.puurkroatie.rds.auth.security.TenantContext;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "booker")
public class Booker {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "booker_id")
    private UUID bookerId;

    @Column(name = "firstname")
    private String firstname;

    @Column(name = "prefix")
    private String prefix;

    @Column(name = "lastname")
    private String lastname;

    @Column(name = "callsign")
    private String callsign;

    @Column(name = "telephone")
    private String telephone;

    @Column(name = "emailaddress")
    private String emailaddress;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender")
    private Gender gender;

    @Column(name = "birthdate")
    private LocalDate birthdate;

    @Column(name = "initials")
    private String initials;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @Column(name = "modified_at")
    private LocalDateTime modifiedAt;

    @Column(name = "modified_by")
    private UUID modifiedBy;

    @Column(name = "tenant_organization", nullable = false, updatable = false)
    private UUID tenantOrganization;

    protected Booker() {
    }

    public Booker(UUID bookerId, String firstname, String prefix, String lastname, String callsign, String telephone, String emailaddress, Gender gender, LocalDate birthdate, String initials) {
        this.bookerId = bookerId;
        this.firstname = firstname;
        this.prefix = prefix;
        this.lastname = lastname;
        this.callsign = callsign;
        this.telephone = telephone;
        this.emailaddress = emailaddress;
        this.gender = gender;
        this.birthdate = birthdate;
        this.initials = initials;
    }

    public Booker(String firstname, String prefix, String lastname, String callsign, String telephone, String emailaddress, Gender gender, LocalDate birthdate, String initials) {
        this.firstname = firstname;
        this.prefix = prefix;
        this.lastname = lastname;
        this.callsign = callsign;
        this.telephone = telephone;
        this.emailaddress = emailaddress;
        this.gender = gender;
        this.birthdate = birthdate;
        this.initials = initials;
    }

    public Booker(UUID bookerId, String firstname, String prefix, String lastname, String callsign, String telephone, String emailaddress, Gender gender, LocalDate birthdate, String initials, LocalDateTime createdAt, UUID createdBy, UUID tenantOrganization) {
        this.bookerId = bookerId;
        this.firstname = firstname;
        this.prefix = prefix;
        this.lastname = lastname;
        this.callsign = callsign;
        this.telephone = telephone;
        this.emailaddress = emailaddress;
        this.gender = gender;
        this.birthdate = birthdate;
        this.initials = initials;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.tenantOrganization = tenantOrganization;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.createdBy = TenantContext.getAccountId();
        this.tenantOrganization = TenantContext.getOrganizationId();
    }

    @PreUpdate
    protected void onUpdate() {
        this.modifiedAt = LocalDateTime.now();
        this.modifiedBy = TenantContext.getAccountId();
    }

    public UUID getBookerId() {
        return bookerId;
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

    public Gender getGender() {
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
