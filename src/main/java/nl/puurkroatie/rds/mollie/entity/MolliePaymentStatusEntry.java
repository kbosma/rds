package nl.puurkroatie.rds.mollie.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import nl.puurkroatie.rds.common.Default;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "mollie_payment_status_entry")
public class MolliePaymentStatusEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "mollie_payment_status_entry_id")
    private UUID molliePaymentStatusEntryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mollie_payment_id", nullable = false)
    private MolliePayment molliePayment;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MolliePaymentStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @Column(name = "modified_at")
    private LocalDateTime modifiedAt;

    @Column(name = "modified_by")
    private UUID modifiedBy;

    protected MolliePaymentStatusEntry() {
    }

    @Default
    public MolliePaymentStatusEntry(MolliePayment molliePayment, MolliePaymentStatus status, UUID createdBy) {
        this.molliePayment = molliePayment;
        this.status = status;
        this.createdBy = createdBy;
    }

    public MolliePaymentStatusEntry(UUID molliePaymentStatusEntryId, MolliePayment molliePayment, MolliePaymentStatus status, UUID createdBy) {
        this.molliePaymentStatusEntryId = molliePaymentStatusEntryId;
        this.molliePayment = molliePayment;
        this.status = status;
        this.createdBy = createdBy;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.modifiedAt = LocalDateTime.now();
    }

    public UUID getMolliePaymentStatusEntryId() {
        return molliePaymentStatusEntryId;
    }

    public MolliePayment getMolliePayment() {
        return molliePayment;
    }

    public MolliePaymentStatus getStatus() {
        return status;
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
