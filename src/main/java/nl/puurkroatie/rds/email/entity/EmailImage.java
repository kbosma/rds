package nl.puurkroatie.rds.email.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import nl.puurkroatie.rds.auth.security.TenantContext;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Een geüploade afbeelding voor gebruik in e-mailtemplates. Onveranderlijk: er is
 * geen update, een gewijzigde afbeelding wordt een nieuwe rij met een nieuwe UUID.
 */
@Entity
@Table(name = "email_image")
public class EmailImage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "email_image_id")
    private UUID emailImageId;

    @Column(name = "original_filename")
    private String originalFilename;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "data", nullable = false, columnDefinition = "bytea")
    private byte[] data;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @Column(name = "tenant_organization", nullable = false, updatable = false)
    private UUID tenantOrganization;

    protected EmailImage() {
    }

    public EmailImage(String originalFilename, String contentType, byte[] data) {
        this.originalFilename = originalFilename;
        this.contentType = contentType;
        this.data = data;
        this.sizeBytes = data.length;
    }

    public EmailImage(UUID emailImageId, String originalFilename, String contentType, byte[] data) {
        this(originalFilename, contentType, data);
        this.emailImageId = emailImageId;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.createdBy = TenantContext.getAccountId();
        this.tenantOrganization = TenantContext.getOrganizationId();
    }

    public UUID getEmailImageId() {
        return emailImageId;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public byte[] getData() {
        return data;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public UUID getTenantOrganization() {
        return tenantOrganization;
    }
}
