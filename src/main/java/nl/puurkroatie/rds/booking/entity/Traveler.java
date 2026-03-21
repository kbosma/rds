package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "traveler")
public class Traveler {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "traveler_id")
    private UUID travelerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(name = "firstname")
    private String firstname;

    @Column(name = "prefix")
    private String prefix;

    @Column(name = "lastname")
    private String lastname;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gender_id")
    private Gender gender;

    @Column(name = "birthdate")
    private LocalDate birthdate;

    @Column(name = "initials")
    private String initials;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "modified_at")
    private LocalDateTime modifiedAt;

    @Column(name = "modified_by")
    private UUID modifiedBy;

    @Column(name = "tenant_organization", nullable = false)
    private UUID tenantOrganization;

    protected Traveler() {
    }

    public Traveler(UUID travelerId, Booking booking, String firstname, String prefix, String lastname, Gender gender, LocalDate birthdate, String initials, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.travelerId = travelerId;
        this.booking = booking;
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

    public Traveler(Booking booking, String firstname, String prefix, String lastname, Gender gender, LocalDate birthdate, String initials, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.booking = booking;
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

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.modifiedAt = LocalDateTime.now();
    }

    public UUID getTravelerId() {
        return travelerId;
    }

    public Booking getBooking() {
        return booking;
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
