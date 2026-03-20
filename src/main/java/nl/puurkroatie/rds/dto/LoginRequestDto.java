package nl.puurkroatie.rds.dto;

public class LoginRequestDto {

    private final String userName;
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
