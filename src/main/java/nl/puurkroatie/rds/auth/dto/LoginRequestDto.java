package nl.puurkroatie.rds.auth.dto;

import jakarta.validation.constraints.NotNull;

public class LoginRequestDto {

    @NotNull
    private final String userName;
    @NotNull
    private final String password;

    public LoginRequestDto(String userName, String password) {
        this.userName = userName;
        this.password = password;
    }

    public String getUserName() {
        return userName;
    }

    public String getPassword() {
        return password;
    }
}
