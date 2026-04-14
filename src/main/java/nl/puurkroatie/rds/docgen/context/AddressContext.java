package nl.puurkroatie.rds.docgen.context;

public class AddressContext {

    private String street;
    private Integer housenumber;
    private String housenumberAddition;
    private String postalcode;
    private String city;
    private String country;
    private String addressrole;

    public AddressContext(String street, Integer housenumber, String housenumberAddition, String postalcode, String city, String country, String addressrole) {
        this.street = street;
        this.housenumber = housenumber;
        this.housenumberAddition = housenumberAddition;
        this.postalcode = postalcode;
        this.city = city;
        this.country = country;
        this.addressrole = addressrole;
    }

    public String getStreet() {
        return street;
    }

    public Integer getHousenumber() {
        return housenumber;
    }

    public String getHousenumberAddition() {
        return housenumberAddition;
    }

    public String getPostalcode() {
        return postalcode;
    }

    public String getCity() {
        return city;
    }

    public String getCountry() {
        return country;
    }

    public String getAddressrole() {
        return addressrole;
    }
}
