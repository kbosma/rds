package nl.puurkroatie.rds.docgen.context;

import java.time.LocalDate;

public class TravelerContext {

    private String firstname;
    private String prefix;
    private String lastname;
    private String gender;
    private LocalDate birthdate;
    private String initials;

    public TravelerContext(String firstname, String prefix, String lastname, String gender, LocalDate birthdate, String initials) {
        this.firstname = firstname;
        this.prefix = prefix;
        this.lastname = lastname;
        this.gender = gender;
        this.birthdate = birthdate;
        this.initials = initials;
    }

    public String getFirstname() {
        return firstname;
    }

    public String getPrefix() {
        return prefix;
    }

    public String getLastname() {
        return lastname;
    }

    public String getGender() {
        return gender;
    }

    public LocalDate getBirthdate() {
        return birthdate;
    }

    public String getInitials() {
        return initials;
    }
}
