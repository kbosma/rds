package nl.puurkroatie.rds.bookerportal.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "otp")
public class Otp {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "otp_id")
    private UUID otpId;

    @Column(name = "emailaddress", nullable = false)
    private String emailaddress;

    @Column(name = "booking_number", nullable = false)
    private String bookingNumber;

    @Column(name = "code", nullable = false)
    private String code;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "verified", nullable = false)
    private boolean verified;

    protected Otp() {
    }

    public Otp(UUID otpId, String emailaddress, String bookingNumber, String code, LocalDateTime createdAt, LocalDateTime expiresAt, boolean verified) {
        this.otpId = otpId;
        this.emailaddress = emailaddress;
        this.bookingNumber = bookingNumber;
        this.code = code;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.verified = verified;
    }

    public Otp(String emailaddress, String bookingNumber, String code, LocalDateTime createdAt, LocalDateTime expiresAt, boolean verified) {
        this.emailaddress = emailaddress;
        this.bookingNumber = bookingNumber;
        this.code = code;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.verified = verified;
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public UUID getOtpId() {
        return otpId;
    }

    public String getEmailaddress() {
        return emailaddress;
    }

    public String getBookingNumber() {
        return bookingNumber;
    }

    public String getCode() {
        return code;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public boolean isVerified() {
        return verified;
    }
}
