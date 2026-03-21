package nl.puurkroatie.rds.auth.entity;

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

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "person")
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "person_id")
    private UUID persoonId;

    @Column(name = "firstname")
    private String firstname;

    @Column(name = "prefix")
    private String prefix;

    @Column(name = "lastname")
    private String lastname;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "modified_at")
    private LocalDateTime modifiedAt;

    @Column(name = "modified_by")
    private UUID modifiedBy;

    protected Person() {
    }

    public Person(UUID persoonId, String firstname, String prefix, String lastname, Organization organization, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.persoonId = persoonId;
        this.firstname = firstname;
        this.prefix = prefix;
        this.lastname = lastname;
        this.organization = organization;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
    }

    public Person(String firstname, String prefix, String lastname, Organization organization, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.firstname = firstname;
        this.prefix = prefix;
        this.lastname = lastname;
        this.organization = organization;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
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

    public UUID getPersoonId() {
        return persoonId;
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

    public Organization getOrganization() {
        return organization;
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
}