package nl.puurkroatie.rds.auth.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import nl.puurkroatie.rds.common.Default;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public class RoleDto {

    private UUID roleId;
    @NotNull
    @Size(max = 255)
    private String description;

    @Default
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
