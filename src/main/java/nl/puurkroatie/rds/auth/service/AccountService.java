package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.dto.AccountDto;
import nl.puurkroatie.rds.auth.dto.ChangePasswordDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountService {

    AccountDto create(AccountDto dto);

    AccountDto update(UUID id, AccountDto dto);

    void delete(UUID id);

    List<AccountDto> findAll();

    Optional<AccountDto> findById(UUID id);

    void changePassword(UUID accountId, ChangePasswordDto dto);

    void verifyAccountAccess(UUID accountId);
}
