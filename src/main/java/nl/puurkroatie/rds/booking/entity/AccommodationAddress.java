package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import nl.puurkroatie.rds.auth.security.TenantContext;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "accommodation_address")
@IdClass(AccommodationAddressId.class)
public class AccommodationAddress {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accommodation_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Accommodation accommodation;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "address_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Address address;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    protected AccommodationAddress() {
    }

    public AccommodationAddress(Accommodation accommodation, Address address) {
        this.accommodation = accommodation;
        this.address = address;
    }

    public Accommodation getAccommodation() {
        return accommodation;
    }

    public Address getAddress() {
        return address;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.createdBy = TenantContext.getAccountId();
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }
}
