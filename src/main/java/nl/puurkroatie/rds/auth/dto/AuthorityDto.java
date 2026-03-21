package nl.puurkroatie.rds.auth.dto;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.UUID;

public class AuthorityDto {

    private UUID authorityId;
    private String description;

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
