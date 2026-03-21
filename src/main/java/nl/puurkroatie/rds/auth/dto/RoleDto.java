package nl.puurkroatie.rds.auth.dto;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.UUID;

public class RoleDto {

    private UUID roleId;
    private String description;

    @JsonCreator
    public RoleDto(UUID roleId, String description) {
        this.roleId = roleId;
        this.description = description;
    }

    public RoleDto(String description) {
        this.description = description;
    }

    public UUID getRoleId() {
        return roleId;
    }

    public String getDescription() {
        return description;
    }
}
