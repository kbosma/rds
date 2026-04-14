package nl.puurkroatie.rds.auth.dto;

public class TotpSetupResponseDto {

    private final String secret;
    private final String qrCodeDataUri;
    private final String manualEntryKey;
    private final String[] recoveryCodes;

    public TotpSetupResponseDto(String secret, String qrCodeDataUri, String manualEntryKey, String[] recoveryCodes) {
        this.secret = secret;
        this.qrCodeDataUri = qrCodeDataUri;
        this.manualEntryKey = manualEntryKey;
        this.recoveryCodes = recoveryCodes;
    }

    public String getSecret() {
        return secret;
    }

    public String getQrCodeDataUri() {
        return qrCodeDataUri;
    }

    public String getManualEntryKey() {
        return manualEntryKey;
    }

    public String[] getRecoveryCodes() {
        return recoveryCodes;
    }
}
