package nl.puurkroatie.rds.docgen.context;

import java.time.LocalDate;
import java.util.List;

public class BookerContext {

    private String firstname;
    private String prefix;
    private String lastname;
    private String callsign;
    private String telephone;
    private String emailaddress;
    private String gender;
    private LocalDate birthdate;
    private String initials;
    private List<AddressContext> addresses;

    public BookerContext(String firstname, String prefix, String lastname, String callsign, String telephone, String emailaddress, String gender, LocalDate birthdate, String initials, List<AddressContext> addresses) {
        this.firstname = firstname;
        this.prefix = prefix;
        this.lastname = lastname;
        this.callsign = callsign;
        this.telephone = telephone;
        this.emailaddress = emailaddress;
        this.gender = gender;
        this.birthdate = birthdate;
        this.initials = initials;
        this.addresses = addresses;
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

    public String getCallsign() {
        return callsign;
    }

    public String getTelephone() {
        return telephone;
    }

    public String getEmailaddress() {
        return emailaddress;
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

    public List<AddressContext> getAddresses() {
        return addresses;
    }
}
