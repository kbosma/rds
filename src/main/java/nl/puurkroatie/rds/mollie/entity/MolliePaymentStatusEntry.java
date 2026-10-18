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

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

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
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MolliePayment molliePayment;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MolliePaymentStatus status;

    /** True bij een handmatige correctie door een medewerker; false bij een regel van Mollie of het systeem. */
    @Column(name = "correction", nullable = false, updatable = false)
    private boolean correction;

    /** Verplicht bij een correctie: waarom de status met de hand is gezet. */
    @Column(name = "reason", updatable = false)
    private String reason;

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

    /** Een handmatige correctie door een medewerker: altijd een NIEUWE regel, nooit een wijziging van een bestaande. */
    public static MolliePaymentStatusEntry correction(MolliePayment molliePayment, MolliePaymentStatus status, UUID createdBy, String reason) {
        MolliePaymentStatusEntry entry = new MolliePaymentStatusEntry(molliePayment, status, createdBy);
        entry.correction = true;
        entry.reason = reason;
        return entry;
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

    public boolean isCorrection() {
        return correction;
    }

    public String getReason() {
        return reason;
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
