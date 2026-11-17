package nl.puurkroatie.rds.auth.service;

import jakarta.persistence.EntityNotFoundException;
import nl.puurkroatie.rds.auth.dto.AccountRoleResponseDto;
import nl.puurkroatie.rds.auth.dto.RoleDto;
import nl.puurkroatie.rds.auth.entity.Account;
import nl.puurkroatie.rds.auth.entity.AccountRole;
import nl.puurkroatie.rds.auth.entity.AccountRoleId;
import nl.puurkroatie.rds.auth.entity.AuthorizationLog.Action;
import nl.puurkroatie.rds.auth.entity.Role;
import nl.puurkroatie.rds.auth.mapper.AccountRoleMapper;
import nl.puurkroatie.rds.auth.mapper.RoleMapper;
import nl.puurkroatie.rds.auth.repository.AccountRepository;
import nl.puurkroatie.rds.auth.repository.AccountRoleRepository;
import nl.puurkroatie.rds.auth.repository.RoleRepository;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.common.ConflictException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Rollen toewijzen en intrekken (docs/voorstel-eigen-rollen.md, §4.3 en §4.4).
 *
 * <ul>
 *   <li>Rol en account horen bij dezelfde organisatie (ook door de database afgedwongen).</li>
 *   <li>In de eigen organisatie: de rol én het account liggen onder je niveau (R(r) ⊆ G(u), E(x) ⊆ G(u)).</li>
 *   <li>Met PLATFORM_ADMIN: systeemrollen (MANAGER, EMPLOYEE, ADMIN) in elke organisatie, bijv. de eerste manager bij
 *       onboarding; eigen rollen van een klant niet.</li>
 *   <li>De laatste beheerder van een organisatie blijft (409).</li>
 * </ul>
 */
@Service
@Transactional
public class AccountRoleService {

    private final AccountRoleRepository accountRoleRepository;
    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final AccountRoleMapper accountRoleMapper;
    private final RoleMapper roleMapper;
    private final AuthorizationRules rules;
    private final AdministratorGuard administratorGuard;
    private final AuthorizationLogService log;

    public AccountRoleService(AccountRoleRepository accountRoleRepository, AccountRepository accountRepository,
                              RoleRepository roleRepository, AccountRoleMapper accountRoleMapper, RoleMapper roleMapper,
                              AuthorizationRules rules, AdministratorGuard administratorGuard, AuthorizationLogService log) {
        this.accountRoleRepository = accountRoleRepository;
        this.accountRepository = accountRepository;
        this.roleRepository = roleRepository;
        this.accountRoleMapper = accountRoleMapper;
        this.roleMapper = roleMapper;
        this.rules = rules;
        this.administratorGuard = administratorGuard;
        this.log = log;
    }

    @Transactional(readOnly = true)
    public List<AccountRoleResponseDto> findAll() {
        List<AccountRole> accountRoles = rules.isPlatformAdmin()
                ? accountRoleRepository.findAll()
                : accountRoleRepository.findByTenantOrganization(TenantContext.getOrganizationId());
        return accountRoles.stream().map(accountRoleMapper::toDto).toList();
    }

    /**
     * De rollen die de ingelogde gebruiker aan dit account mag toewijzen of ervan mag intrekken. Zonder account: de
     * rollen van de eigen organisatie die onder het eigen niveau liggen. De frontend toont alleen deze rollen.
     */
    @Transactional(readOnly = true)
    public List<RoleDto> findAssignableRoles(UUID accountId) {
        Set<String> grantable = rules.grantable();
        if (accountId == null) {
            return roleRepository.findByTenantOrganizationOrderByDescription(TenantContext.getOrganizationId()).stream()
                    .filter(role -> canManage(role, null, grantable))
                    .map(roleMapper::toDto)
                    .toList();
        }
        Account account = findVisibleAccount(accountId);
        return roleRepository.findByTenantOrganizationOrderByDescription(account.getTenantOrganization()).stream()
                .filter(role -> canManage(role, account, grantable))
                .map(roleMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<AccountRoleResponseDto> findById(UUID accountId, UUID roleId) {
        return accountRoleRepository.findById(new AccountRoleId(accountId, roleId))
                .filter(ar -> rules.isPlatformAdmin() || ar.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(accountRoleMapper::toDto);
    }

    public AccountRoleResponseDto create(UUID accountId, UUID roleId) {
        Account account = findVisibleAccount(accountId);
        Role role = findRoleOfOrganization(roleId, account.getTenantOrganization());
        verifyCanManage(role, account);
        if (accountRoleRepository.existsById(new AccountRoleId(accountId, roleId))) {
            throw new ConflictException("Dit account heeft de rol " + role.getDescription() + " al");
        }
        AccountRole saved = accountRoleRepository.save(new AccountRole(account, role));
        log.assignmentEvent(Action.ROLE_ASSIGNED, role, account);
        return accountRoleMapper.toDto(saved);
    }

    public void deleteById(UUID accountId, UUID roleId) {
        Account account = findVisibleAccount(accountId);
        AccountRole existing = accountRoleRepository.findById(new AccountRoleId(accountId, roleId))
                .orElseThrow(() -> new EntityNotFoundException("Account-role link not found"));
        Role role = existing.getRole();
        verifyCanManage(role, account);
        if (role.isSystemRole() && role.getSystemKey().equals(administratorGuard.administratorKey(account.getTenantOrganization()))) {
            administratorGuard.verifyNotLastAdministrator(accountId, account.getTenantOrganization());
        }
        accountRoleRepository.delete(existing);
        log.assignmentEvent(Action.ROLE_REVOKED, role, account);
    }

    private void verifyCanManage(Role role, Account account) {
        if (rules.isPlatformAdmin() && role.isSystemRole()) {
            return;
        }
        if (!account.getTenantOrganization().equals(TenantContext.getOrganizationId())) {
            // Een beheerder mag bij een klant alleen systeemrollen beheren; voor anderen bestaat het account niet.
            if (rules.isPlatformAdmin()) {
                throw new AccessDeniedException("Eigen rollen van een organisatie beheert die organisatie zelf");
            }
            throw new EntityNotFoundException("Account not found with id: " + account.getAccountId());
        }
        Set<String> grantable = rules.grantable();
        if (!grantable.containsAll(rules.roleAuthorities(role.getRoleId()))) {
            throw new AccessDeniedException("Deze rol bevat rechten die je zelf niet hebt");
        }
        if (!grantable.containsAll(rules.effectiveAuthorities(account.getAccountId()))) {
            throw new AccessDeniedException("Dit account heeft meer rechten dan jij");
        }
    }

    private boolean canManage(Role role, Account account, Set<String> grantable) {
        if (rules.isPlatformAdmin() && role.isSystemRole()) {
            return true;
        }
        if (account != null && !account.getTenantOrganization().equals(TenantContext.getOrganizationId())) {
            return false;
        }
        return grantable.containsAll(rules.roleAuthorities(role.getRoleId()))
                && (account == null || grantable.containsAll(rules.effectiveAuthorities(account.getAccountId())));
    }

    private Account findVisibleAccount(UUID accountId) {
        return accountRepository.findById(accountId)
                .filter(a -> rules.isPlatformAdmin() || a.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .orElseThrow(() -> new EntityNotFoundException("Account not found with id: " + accountId));
    }

    private Role findRoleOfOrganization(UUID roleId, UUID organizationId) {
        return roleRepository.findById(roleId)
                .filter(r -> r.getTenantOrganization().equals(organizationId))
                .orElseThrow(() -> new EntityNotFoundException("Role not found with id: " + roleId));
    }
}
