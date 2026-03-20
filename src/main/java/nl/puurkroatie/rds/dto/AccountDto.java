package nl.puurkroatie.rds.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class AccountDto {

    private UUID accountId;
    private String userName;
    private String password;
    private UUID personId;
    private Boolean locked;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private UUID createdBy;
    private LocalDateTime modifiedAt;
    private UUID modifiedBy;

    public AccountDto(UUID accountId, String userName, String password, UUID personId, Boolean locked, LocalDateTime expiresAt, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.accountId = accountId;
        this.userName = userName;
        this.password = password;
        this.personId = personId;
        this.locked = locked;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
    }

    public AccountDto(String userName, String password, UUID personId, Boolean locked, LocalDateTime expiresAt, LocalDateTime createdAt, UUID createdBy, LocalDateTime modifiedAt, UUID modifiedBy) {
        this.userName = userName;
        this.password = password;
        this.personId = personId;
        this.locked = locked;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
        this.modifiedAt = modifiedAt;
        this.modifiedBy = modifiedBy;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public String getUserName() {
        return userName;
    }

    public String getPassword() {
        return password;
    }

    public UUID getPersonId() {
        return personId;
    }

    public Boolean getLocked() {
        return locked;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
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
