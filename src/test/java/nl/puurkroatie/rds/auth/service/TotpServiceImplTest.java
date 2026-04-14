package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.dto.TotpSetupResponseDto;
import nl.puurkroatie.rds.auth.entity.Account;
import nl.puurkroatie.rds.auth.repository.AccountRepository;
import nl.puurkroatie.rds.auth.service.impl.TotpServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TotpServiceImplTest {

    private AccountRepository accountRepository;
    private PasswordEncoder passwordEncoder;
    private TotpServiceImpl totpService;

    private static final UUID ACCOUNT_ID = UUID.fromString("e1000000-0000-0000-0000-000000000001");

    @BeforeEach
    void setUp() {
        accountRepository = mock(AccountRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        totpService = new TotpServiceImpl(accountRepository, passwordEncoder);
    }

    @Test
    void generateSecret_returnsSetupWithQrAndRecoveryCodes() {
        Account account = mock(Account.class);
        when(account.getUserName()).thenReturn("testuser");
        when(accountRepository.findById(ACCOUNT_ID)).thenReturn(Optional.of(account));

        TotpSetupResponseDto result = totpService.generateSecret(ACCOUNT_ID);

        assertNotNull(result.getSecret());
        assertNotNull(result.getQrCodeDataUri());
        assertTrue(result.getQrCodeDataUri().startsWith("data:image/png;base64,"));
        assertNotNull(result.getManualEntryKey());
        assertEquals(8, result.getRecoveryCodes().length);

        verify(accountRepository).updateTotp(eq(ACCOUNT_ID), any(String.class), eq(false), eq(false), any(String.class));
    }

    @Test
    void verifyAndEnable_validCode_enablesTotp() {
        String secret = new dev.samstevens.totp.secret.DefaultSecretGenerator().generate();
        String validCode = generateCurrentCode(secret);

        Account account = mock(Account.class);
        when(account.getTotpSecret()).thenReturn(secret);
        when(account.getRecoveryCodes()).thenReturn("[]");
        when(accountRepository.findById(ACCOUNT_ID)).thenReturn(Optional.of(account));

        totpService.verifyAndEnable(ACCOUNT_ID, validCode);

        verify(accountRepository).updateTotp(eq(ACCOUNT_ID), eq(secret), eq(true), eq(true), eq("[]"));
    }

    @Test
    void verifyAndEnable_invalidCode_throwsException() {
        String secret = new dev.samstevens.totp.secret.DefaultSecretGenerator().generate();

        Account account = mock(Account.class);
        when(account.getTotpSecret()).thenReturn(secret);
        when(accountRepository.findById(ACCOUNT_ID)).thenReturn(Optional.of(account));

        assertThrows(RuntimeException.class, () -> totpService.verifyAndEnable(ACCOUNT_ID, "000000"));
    }

    @Test
    void verifyAndEnable_noSecretSetUp_throwsException() {
        Account account = mock(Account.class);
        when(account.getTotpSecret()).thenReturn(null);
        when(accountRepository.findById(ACCOUNT_ID)).thenReturn(Optional.of(account));

        assertThrows(RuntimeException.class, () -> totpService.verifyAndEnable(ACCOUNT_ID, "123456"));
    }

    @Test
    void disable_validCode_resetsTotp() {
        String secret = new dev.samstevens.totp.secret.DefaultSecretGenerator().generate();
        String validCode = generateCurrentCode(secret);

        Account account = mock(Account.class);
        when(account.getTotpEnabled()).thenReturn(true);
        when(account.getTotpSecret()).thenReturn(secret);
        when(accountRepository.findById(ACCOUNT_ID)).thenReturn(Optional.of(account));

        totpService.disable(ACCOUNT_ID, validCode);

        verify(accountRepository).updateTotp(eq(ACCOUNT_ID), eq(null), eq(false), eq(false), eq(null));
    }

    @Test
    void disable_notEnabled_throwsException() {
        Account account = mock(Account.class);
        when(account.getTotpEnabled()).thenReturn(false);
        when(accountRepository.findById(ACCOUNT_ID)).thenReturn(Optional.of(account));

        assertThrows(RuntimeException.class, () -> totpService.disable(ACCOUNT_ID, "123456"));
    }

    @Test
    void adminReset_resetsTotp() {
        Account account = mock(Account.class);
        when(accountRepository.findById(ACCOUNT_ID)).thenReturn(Optional.of(account));

        totpService.adminReset(ACCOUNT_ID);

        verify(accountRepository).updateTotp(ACCOUNT_ID, null, false, false, null);
    }

    @Test
    void verifyRecoveryCode_validCode_returnsTrue() {
        Account account = mock(Account.class);
        when(account.getTotpSecret()).thenReturn("secret");
        when(account.getTotpEnabled()).thenReturn(true);
        when(account.getTotpVerified()).thenReturn(true);

        // Generate a recovery code setup first
        Account setupAccount = mock(Account.class);
        when(setupAccount.getUserName()).thenReturn("testuser");
        when(accountRepository.findById(ACCOUNT_ID)).thenReturn(Optional.of(setupAccount));

        TotpSetupResponseDto setup = totpService.generateSecret(ACCOUNT_ID);
        String[] recoveryCodes = setup.getRecoveryCodes();

        // Capture the hashed recovery codes that were stored
        ArgumentCaptor<String> recoveryCodesCaptor = ArgumentCaptor.forClass(String.class);
        verify(accountRepository).updateTotp(eq(ACCOUNT_ID), any(), eq(false), eq(false), recoveryCodesCaptor.capture());

        // Now set up the account mock with the captured recovery codes
        Account accountWithCodes = mock(Account.class);
        when(accountWithCodes.getRecoveryCodes()).thenReturn(recoveryCodesCaptor.getValue());
        when(accountWithCodes.getTotpSecret()).thenReturn("secret");
        when(accountWithCodes.getTotpEnabled()).thenReturn(true);
        when(accountWithCodes.getTotpVerified()).thenReturn(true);
        when(accountRepository.findById(ACCOUNT_ID)).thenReturn(Optional.of(accountWithCodes));

        boolean result = totpService.verifyRecoveryCode(ACCOUNT_ID, recoveryCodes[0]);

        assertTrue(result);
    }

    @Test
    void verifyRecoveryCode_invalidCode_returnsFalse() {
        Account account = mock(Account.class);
        when(account.getRecoveryCodes()).thenReturn("[\"$2a$10$somehash\"]");
        when(accountRepository.findById(ACCOUNT_ID)).thenReturn(Optional.of(account));

        boolean result = totpService.verifyRecoveryCode(ACCOUNT_ID, "INVALIDCODE");

        assertFalse(result);
    }

    private String generateCurrentCode(String secret) {
        dev.samstevens.totp.code.DefaultCodeGenerator generator =
                new dev.samstevens.totp.code.DefaultCodeGenerator(dev.samstevens.totp.code.HashingAlgorithm.SHA1);
        try {
            long counter = Math.floorDiv(System.currentTimeMillis() / 1000, 30);
            return generator.generate(secret, counter);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
