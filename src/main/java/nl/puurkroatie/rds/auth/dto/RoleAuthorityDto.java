package nl.puurkroatie.rds.auth.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class RoleAuthorityDto {

    @NotNull
    private final UUID roleId;
    @NotNull
    private final UUID authorityId;

    public RoleAuthorityDto(UUID roleId, UUID authorityId) {
        this.roleId = roleId;
        this.authorityId = authorityId;
    }

    public UUID getRoleId() {
        return roleId;
    }

    public UUID getAuthorityId() {
        return authorityId;
    }
}
