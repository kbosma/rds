package nl.puurkroatie.rds.auth.dto;

public class ChangePasswordDto {

    private String currentPassword;
    private String newPassword;

    public ChangePasswordDto(String currentPassword, String newPassword) {
        this.currentPassword = currentPassword;
        this.newPassword = newPassword;
    }

    public String getCurrentPassword() {
        return currentPassword;
    }

    public String getNewPassword() {
        return newPassword;
    }
}
