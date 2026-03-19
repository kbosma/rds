package nl.puurkroatie.rds.dto;

import java.util.UUID;

public class AuthorityDto {

    private UUID authorityId;
    private String description;

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
