package nl.puurkroatie.rds.dto;

import java.util.UUID;

public class RoleAuthorityDto {

    private UUID roleId;
    private UUID authorityId;

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
