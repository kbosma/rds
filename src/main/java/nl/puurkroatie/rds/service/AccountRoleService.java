package nl.puurkroatie.rds.service;

import nl.puurkroatie.rds.entity.AccountRole;
import nl.puurkroatie.rds.entity.AccountRoleId;
import nl.puurkroatie.rds.repository.AccountRoleRepository;
import nl.puurkroatie.rds.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
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
        if (isAdmin()) {
            return accountRoleRepository.findAll();
        }
        return accountRoleRepository.findByAccountPersonOrganizationOrganizationId(TenantContext.getOrganizationId());
    }

    public Optional<AccountRole> findById(UUID accountId, UUID roleId) {
        return accountRoleRepository.findById(new AccountRoleId(accountId, roleId))
                .filter(ar -> isAdmin() || ar.getAccount().getPerson().getOrganization().getOrganizationId().equals(TenantContext.getOrganizationId()));
    }

    public AccountRole save(AccountRole accountRole) {
        if (!isAdmin()) {
            verifyOrganization(accountRole.getAccount().getPerson().getOrganization().getOrganizationId());
        }
        return accountRoleRepository.save(accountRole);
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
