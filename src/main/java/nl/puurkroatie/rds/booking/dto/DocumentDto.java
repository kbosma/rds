package nl.puurkroatie.rds.booking.dto;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.time.LocalDateTime;
import java.util.UUID;

public class DocumentDto {

    private UUID documentId;
    private UUID bookingId;
    private String displayname;
    private byte[] document;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;
    private UUID tenantOrganization;

    @JsonCreator
    public DocumentDto(UUID documentId, UUID bookingId, String displayname, byte[] document, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.documentId = documentId;
        this.bookingId = bookingId;
        this.displayname = displayname;
        this.document = document;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public DocumentDto(UUID bookingId, String displayname, byte[] document, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.bookingId = bookingId;
        this.displayname = displayname;
        this.document = document;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public UUID getDocumentId() {
        return documentId;
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public String getDisplayname() {
        return displayname;
    }

    public byte[] getDocument() {
        return document;
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
