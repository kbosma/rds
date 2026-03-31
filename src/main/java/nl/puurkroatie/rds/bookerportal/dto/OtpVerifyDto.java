package nl.puurkroatie.rds.bookerportal.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class OtpVerifyDto {

    @NotNull
    @Email
    private String emailaddress;
    @NotNull
    private String bookingNumber;
    @NotNull
    @Size(min = 6, max = 6)
    private String code;

    public OtpVerifyDto(String emailaddress, String bookingNumber, String code) {
        this.emailaddress = emailaddress;
        this.bookingNumber = bookingNumber;
        this.code = code;
    }

    public String getEmailaddress() {
        return emailaddress;
    }

    public String getBookingNumber() {
        return bookingNumber;
    }

    public String getCode() {
        return code;
    }
}
