package nl.puurkroatie.rds.booking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "gender")
public class Gender {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "gender_id")
    private UUID genderId;

    @Column(name = "displayname", nullable = false)
    private String displayname;

    protected Gender() {
    }

    public Gender(UUID genderId, String displayname) {
        this.genderId = genderId;
        this.displayname = displayname;
    }

    public Gender(String displayname) {
        this.displayname = displayname;
    }

    public UUID getGenderId() {
        return genderId;
    }

    public String getDisplayname() {
        return displayname;
    }
}
