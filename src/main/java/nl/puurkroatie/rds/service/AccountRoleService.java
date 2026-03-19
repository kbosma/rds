package nl.puurkroatie.rds.service;

import nl.puurkroatie.rds.entity.AccountRole;
import nl.puurkroatie.rds.entity.AccountRoleId;
import nl.puurkroatie.rds.repository.AccountRoleRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AccountRoleService {

    private final AccountRoleRepository accountRoleRepository;

    public AccountRoleService(AccountRoleRepository accountRoleRepository) {
        this.accountRoleRepository = accountRoleRepository;
    }

    public List<AccountRole> findAll() {
        return accountRoleRepository.findAll();
    }

    public Optional<AccountRole> findById(UUID accountId, UUID roleId) {
        return accountRoleRepository.findById(new AccountRoleId(accountId, roleId));
    }

    public AccountRole save(AccountRole accountRole) {
        return accountRoleRepository.save(accountRole);
    }

    public void deleteById(UUID accountId, UUID roleId) {
        accountRoleRepository.deleteById(new AccountRoleId(accountId, roleId));
    }
}
