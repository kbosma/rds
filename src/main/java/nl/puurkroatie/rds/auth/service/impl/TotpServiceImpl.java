package nl.puurkroatie.rds.auth.service.impl;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import nl.puurkroatie.rds.auth.dto.TotpSetupResponseDto;
import nl.puurkroatie.rds.auth.entity.Account;
import nl.puurkroatie.rds.auth.repository.AccountRepository;
import nl.puurkroatie.rds.auth.service.TotpService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class TotpServiceImpl implements TotpService {

    private static final String ISSUER = "RDS";
    private static final int RECOVERY_CODE_COUNT = 8;
    private static final int RECOVERY_CODE_LENGTH = 8;
    private static final String RECOVERY_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecretGenerator secretGenerator;
    private final CodeVerifier codeVerifier;

    public TotpServiceImpl(AccountRepository accountRepository,
                           PasswordEncoder passwordEncoder) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.secretGenerator = new DefaultSecretGenerator();
        this.codeVerifier = new DefaultCodeVerifier(
                new DefaultCodeGenerator(HashingAlgorithm.SHA1),
                new SystemTimeProvider());
    }

    @Override
    public TotpSetupResponseDto generateSecret(UUID accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + accountId));

        String secret = secretGenerator.generate();
        String[] plainRecoveryCodes = generateRecoveryCodes();
        String hashedRecoveryCodesJson = hashAndSerializeRecoveryCodes(plainRecoveryCodes);

        accountRepository.updateTotp(accountId, secret, false, false, hashedRecoveryCodesJson);

        String otpAuthUri = buildOtpAuthUri(secret, account.getUserName());
        String qrCodeDataUri = generateQrCodeDataUri(otpAuthUri);

        return new TotpSetupResponseDto(secret, qrCodeDataUri, secret, plainRecoveryCodes);
    }

    @Override
    public void verifyAndEnable(UUID accountId, String code) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + accountId));

        if (account.getTotpSecret() == null) {
            throw new RuntimeException("TOTP not set up. Call setup first.");
        }

        if (!verifyCode(account.getTotpSecret(), code)) {
            throw new RuntimeException("Invalid TOTP code");
        }

        accountRepository.updateTotp(accountId, account.getTotpSecret(), true, true, account.getRecoveryCodes());
    }

    @Override
    public boolean verifyCode(String secret, String code) {
        return codeVerifier.isValidCode(secret, code);
    }

    @Override
    public void disable(UUID accountId, String code) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + accountId));

        if (!Boolean.TRUE.equals(account.getTotpEnabled())) {
            throw new RuntimeException("TOTP is not enabled");
        }

        if (!verifyCode(account.getTotpSecret(), code)) {
            throw new RuntimeException("Invalid TOTP code");
        }

        accountRepository.updateTotp(accountId, null, false, false, null);
    }

    @Override
    public boolean verifyRecoveryCode(UUID accountId, String code) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + accountId));

        if (account.getRecoveryCodes() == null) {
            return false;
        }

        List<String> hashedCodes = deserializeRecoveryCodes(account.getRecoveryCodes());
        String normalizedCode = code.toUpperCase().trim();

        for (int i = 0; i < hashedCodes.size(); i++) {
            if (passwordEncoder.matches(normalizedCode, hashedCodes.get(i))) {
                hashedCodes.remove(i);
                String updatedJson = serializeRecoveryCodes(hashedCodes);
                accountRepository.updateTotp(accountId, account.getTotpSecret(), account.getTotpEnabled(), account.getTotpVerified(), updatedJson);
                return true;
            }
        }
        return false;
    }

    @Override
    public void adminReset(UUID accountId) {
        accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + accountId));
        accountRepository.updateTotp(accountId, null, false, false, null);
    }

    private String buildOtpAuthUri(String secret, String userName) {
        return "otpauth://totp/" + URLEncoder.encode(ISSUER + ":" + userName, StandardCharsets.UTF_8)
                + "?secret=" + secret
                + "&issuer=" + URLEncoder.encode(ISSUER, StandardCharsets.UTF_8)
                + "&algorithm=SHA1&digits=6&period=30";
    }

    private String generateQrCodeDataUri(String otpAuthUri) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(otpAuthUri, BarcodeFormat.QR_CODE, 250, 250);
            BufferedImage image = MatrixToImageWriter.toBufferedImage(bitMatrix);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", baos);
            String base64 = Base64.getEncoder().encodeToString(baos.toByteArray());
            return "data:image/png;base64," + base64;
        } catch (WriterException | IOException e) {
            throw new RuntimeException("Failed to generate QR code", e);
        }
    }

    private String[] generateRecoveryCodes() {
        SecureRandom random = new SecureRandom();
        String[] codes = new String[RECOVERY_CODE_COUNT];
        for (int i = 0; i < RECOVERY_CODE_COUNT; i++) {
            StringBuilder sb = new StringBuilder(RECOVERY_CODE_LENGTH);
            for (int j = 0; j < RECOVERY_CODE_LENGTH; j++) {
                sb.append(RECOVERY_CODE_CHARS.charAt(random.nextInt(RECOVERY_CODE_CHARS.length())));
            }
            codes[i] = sb.toString();
        }
        return codes;
    }

    private String hashAndSerializeRecoveryCodes(String[] plainCodes) {
        List<String> hashed = new ArrayList<>();
        for (String code : plainCodes) {
            hashed.add(passwordEncoder.encode(code));
        }
        return serializeRecoveryCodes(hashed);
    }

    private String serializeRecoveryCodes(List<String> codes) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < codes.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append("\"").append(codes.get(i).replace("\\", "\\\\").replace("\"", "\\\"")).append("\"");
        }
        sb.append("]");
        return sb.toString();
    }

    private List<String> deserializeRecoveryCodes(String json) {
        List<String> codes = new ArrayList<>();
        String content = json.trim();
        if (content.startsWith("[") && content.endsWith("]")) {
            content = content.substring(1, content.length() - 1);
        }
        if (content.isEmpty()) return codes;

        int i = 0;
        while (i < content.length()) {
            int start = content.indexOf('"', i);
            if (start == -1) break;
            int end = start + 1;
            while (end < content.length()) {
                if (content.charAt(end) == '\\') {
                    end += 2;
                } else if (content.charAt(end) == '"') {
                    break;
                } else {
                    end++;
                }
            }
            codes.add(content.substring(start + 1, end).replace("\\\"", "\"").replace("\\\\", "\\"));
            i = end + 1;
        }
        return codes;
    }
}
