package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.dto.TotpSetupResponseDto;

import java.util.UUID;

public interface TotpService {

    TotpSetupResponseDto generateSecret(UUID accountId);

    void verifyAndEnable(UUID accountId, String code);

    boolean verifyCode(String secret, String code);

    void disable(UUID accountId, String code);

    boolean verifyRecoveryCode(UUID accountId, String code);

    void adminReset(UUID accountId);
}
