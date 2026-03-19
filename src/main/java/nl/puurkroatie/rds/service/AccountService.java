package nl.puurkroatie.rds.service;

import nl.puurkroatie.rds.dto.AccountDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountService {

    AccountDto create(AccountDto dto);

    AccountDto update(UUID id, AccountDto dto);

    void delete(UUID id);

    List<AccountDto> findAll();

    Optional<AccountDto> findById(UUID id);
}
