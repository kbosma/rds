package nl.puurkroatie.rds.bookerportal.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;

public class OtpRequestDto {

    @NotNull
    @Email
    private String emailaddress;
    @NotNull
    private String bookingNumber;

    public OtpRequestDto(String emailaddress, String bookingNumber) {
        this.emailaddress = emailaddress;
        this.bookingNumber = bookingNumber;
    }

    public String getEmailaddress() {
        return emailaddress;
    }

    public String getBookingNumber() {
        return bookingNumber;
    }
}
