package nl.puurkroatie.rds.email.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.entity.Booking;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Een verzonden e-mail aan de hoofdboeker van een boeking, bewaard zoals hij verstuurd is. Alleen-toevoegen
 * (afgedwongen met triggers, migratie V14): een regel wordt nooit gewijzigd of verwijderd.
 */
@Entity
@Table(name = "sent_email")
public class SentEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "sent_email_id")
    private UUID sentEmailId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, updatable = false)
    private Booking booking;

    @Column(name = "from_address", nullable = false, updatable = false)
    private String fromAddress;

    @Column(name = "to_address", nullable = false, updatable = false)
    private String toAddress;

    @Column(name = "subject", nullable = false, updatable = false)
    private String subject;

    @Column(name = "body_html", nullable = false, updatable = false)
    private String bodyHtml;

    @Column(name = "resent_from_id", updatable = false)
    private UUID resentFromId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @Column(name = "tenant_organization", nullable = false, updatable = false)
    private UUID tenantOrganization;

    protected SentEmail() {
    }

    public SentEmail(Booking booking, String fromAddress, String toAddress, String subject, String bodyHtml, UUID resentFromId) {
        this.booking = booking;
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.subject = subject;
        this.bodyHtml = bodyHtml;
        this.resentFromId = resentFromId;
        this.tenantOrganization = booking.getTenantOrganization();
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.createdBy = TenantContext.getAccountId();
    }

    public UUID getSentEmailId() { return sentEmailId; }
    public Booking getBooking() { return booking; }
    public String getFromAddress() { return fromAddress; }
    public String getToAddress() { return toAddress; }
    public String getSubject() { return subject; }
    public String getBodyHtml() { return bodyHtml; }
    public UUID getResentFromId() { return resentFromId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public UUID getCreatedBy() { return createdBy; }
    public UUID getTenantOrganization() { return tenantOrganization; }
}
