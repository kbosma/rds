package nl.puurkroatie.rds.mollie.dto;

public class PaymentStatusRequestDto {

    private String id;

    public PaymentStatusRequestDto() {
    }

    public PaymentStatusRequestDto(String id) {
        this.id = id;
    }

    public String getId() {
        return id;
    }
}
