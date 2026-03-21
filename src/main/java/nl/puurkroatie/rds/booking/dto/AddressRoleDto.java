package nl.puurkroatie.rds.booking.dto;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.UUID;

public class AddressRoleDto {

    private UUID addressroleId;
    private String displayname;

    @JsonCreator
    public AddressRoleDto(UUID addressroleId, String displayname) {
        this.addressroleId = addressroleId;
        this.displayname = displayname;
    }

    public AddressRoleDto(String displayname) {
        this.displayname = displayname;
    }

    public UUID getAddressroleId() {
        return addressroleId;
    }

    public String getDisplayname() {
        return displayname;
    }
}
