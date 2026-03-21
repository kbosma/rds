package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "address_role")
public class AddressRole {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "addressrole_id")
    private UUID addressroleId;

    @Column(name = "displayname", nullable = false)
    private String displayname;

    protected AddressRole() {
    }

    public AddressRole(UUID addressroleId, String displayname) {
        this.addressroleId = addressroleId;
        this.displayname = displayname;
    }

    public AddressRole(String displayname) {
        this.displayname = displayname;
    }

    public UUID getAddressroleId() {
        return addressroleId;
    }

    public String getDisplayname() {
        return displayname;
    }
}
