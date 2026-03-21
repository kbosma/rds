package nl.puurkroatie.rds.booking.dto;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.time.LocalDateTime;
import java.util.UUID;

public class SupplierDto {

    private UUID supplierId;
    private String key;
    private String name;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;
    private UUID tenantOrganization;

    @JsonCreator
    public SupplierDto(UUID supplierId, String key, String name, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.supplierId = supplierId;
        this.key = key;
        this.name = name;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public SupplierDto(String key, String name, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy, UUID tenantOrganization) {
        this.key = key;
        this.name = name;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
        this.tenantOrganization = tenantOrganization;
    }

    public UUID getSupplierId() {
        return supplierId;
    }

    public String getKey() {
        return key;
    }

    public String getName() {
        return name;
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
