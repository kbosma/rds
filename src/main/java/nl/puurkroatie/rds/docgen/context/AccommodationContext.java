package nl.puurkroatie.rds.docgen.context;

import java.util.List;

public class AccommodationContext {

    private String key;
    private String name;
    private List<AddressContext> addresses;

    public AccommodationContext(String key, String name, List<AddressContext> addresses) {
        this.key = key;
        this.name = name;
        this.addresses = addresses;
    }

    public String getKey() {
        return key;
    }

    public String getName() {
        return name;
    }

    public List<AddressContext> getAddresses() {
        return addresses;
    }
}


