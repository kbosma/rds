package nl.puurkroatie.rds.auth.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import nl.puurkroatie.rds.common.Default;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public class AuthorityDto {

    private UUID authorityId;
    @NotNull
    @Size(max = 255)
    private String description;

    @Default
    @JsonCreator
    public AuthorityDto(UUID authorityId, String description) {
        this.authorityId = authorityId;
        this.description = description;
    }

    public AuthorityDto(String description) {
        this.description = description;
    }

    public UUID getAuthorityId() {
        return authorityId;
    }

    public String getDescription() {
        return description;
    }
}
