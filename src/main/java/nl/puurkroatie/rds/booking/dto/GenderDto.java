package nl.puurkroatie.rds.booking.dto;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.UUID;

public class GenderDto {

    private UUID genderId;
    private String displayname;

    @JsonCreator
    public GenderDto(UUID genderId, String displayname) {
        this.genderId = genderId;
        this.displayname = displayname;
    }

    public GenderDto(String displayname) {
        this.displayname = displayname;
    }

    public UUID getGenderId() {
        return genderId;
    }

    public String getDisplayname() {
        return displayname;
    }
}
