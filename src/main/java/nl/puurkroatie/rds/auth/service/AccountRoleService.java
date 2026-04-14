package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.entity.Account;
import nl.puurkroatie.rds.auth.entity.AccountRole;
import nl.puurkroatie.rds.auth.entity.AccountRoleId;
import nl.puurkroatie.rds.auth.entity.Role;
import nl.puurkroatie.rds.auth.repository.AccountRepository;
import nl.puurkroatie.rds.auth.repository.AccountRoleRepository;
import nl.puurkroatie.rds.auth.repository.RoleRepository;
import nl.puurkroatie.rds.auth.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class AccountRoleService {

    private final AccountRoleRepository accountRoleRepository;
    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;

    public AccountRoleService(AccountRoleRepository accountRoleRepository, AccountRepository accountRepository, RoleRepository roleRepository) {
        this.accountRoleRepository = accountRoleRepository;
        this.accountRepository = accountRepository;
        this.roleRepository = roleRepository;
    }

    @Transactional(readOnly = true)
    public List<AccountRole> findAll() {
        if (isAdmin()) {
            return accountRoleRepository.findAll();
        }
        return accountRoleRepository.findByAccountPersonOrganizationOrganizationId(TenantContext.getOrganizationId());
    }

    @Transactional(readOnly = true)
    public Optional<AccountRole> findById(UUID accountId, UUID roleId) {
        return accountRoleRepository.findById(new AccountRoleId(accountId, roleId))
                .filter(ar -> isAdmin() || ar.getAccount().getPerson().getOrganization().getOrganizationId().equals(TenantContext.getOrganizationId()));
    }

    public AccountRole create(UUID accountId, UUID roleId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + accountId));
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Role not found with id: " + roleId));
        if (!isAdmin()) {
            verifyOrganization(account.getPerson().getOrganization().getOrganizationId());
        }
        return accountRoleRepository.save(new AccountRole(account, role));
    }

    public void deleteById(UUID accountId, UUID roleId) {
        if (!isAdmin()) {
            AccountRole existing = accountRoleRepository.findById(new AccountRoleId(accountId, roleId))
                    .orElseThrow(() -> new RuntimeException("AccountRole not found"));
            verifyOrganization(existing.getAccount().getPerson().getOrganization().getOrganizationId());
        }
        accountRoleRepository.deleteById(new AccountRoleId(accountId, roleId));
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }
}
