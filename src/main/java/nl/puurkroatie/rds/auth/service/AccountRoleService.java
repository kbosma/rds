package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.dto.AccountRoleResponseDto;
import nl.puurkroatie.rds.auth.dto.RoleDto;
import nl.puurkroatie.rds.auth.entity.Account;
import nl.puurkroatie.rds.auth.entity.AccountRole;
import nl.puurkroatie.rds.auth.entity.AccountRoleId;
import nl.puurkroatie.rds.auth.entity.Role;
import nl.puurkroatie.rds.auth.mapper.AccountRoleMapper;
import nl.puurkroatie.rds.auth.mapper.RoleMapper;
import nl.puurkroatie.rds.auth.repository.AccountRepository;
import nl.puurkroatie.rds.auth.repository.AccountRoleRepository;
import nl.puurkroatie.rds.auth.repository.RoleRepository;
import nl.puurkroatie.rds.auth.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class AccountRoleService {

    /**
     * Rollen die een niet-ADMIN (bv. een MANAGER) mag toewijzen en intrekken. Rollen zijn globaal en
     * ADMIN omzeilt alle tenantcontroles: zonder deze beperking kan een manager zichzelf ADMIN maken.
     * Bewust een whitelist: nieuwe of aangepaste rollen zijn zo standaard alleen door ADMIN te beheren.
     */
    private static final Set<String> ROLES_MANAGEABLE_BY_NON_ADMIN = Set.of("EMPLOYEE", "MANAGER");

    private final AccountRoleRepository accountRoleRepository;
    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final AccountRoleMapper accountRoleMapper;
    private final RoleMapper roleMapper;

    public AccountRoleService(AccountRoleRepository accountRoleRepository, AccountRepository accountRepository,
                              RoleRepository roleRepository, AccountRoleMapper accountRoleMapper, RoleMapper roleMapper) {
        this.accountRoleRepository = accountRoleRepository;
        this.accountRepository = accountRepository;
        this.roleRepository = roleRepository;
        this.accountRoleMapper = accountRoleMapper;
        this.roleMapper = roleMapper;
    }

    @Transactional(readOnly = true)
    public List<AccountRoleResponseDto> findAll() {
        List<AccountRole> accountRoles = isAdmin()
                ? accountRoleRepository.findAll()
                : accountRoleRepository.findByAccountPersonOrganizationOrganizationId(TenantContext.getOrganizationId());
        return accountRoles.stream().map(accountRoleMapper::toDto).toList();
    }

    /**
     * De rollen die de ingelogde gebruiker mag toewijzen en intrekken: ADMIN alle rollen, anderen alleen de
     * rollen uit {@link #ROLES_MANAGEABLE_BY_NON_ADMIN}. De frontend toont alleen deze rollen, zodat de
     * regel op één plek (hier) staat en de UI geen rolnamen hoeft te kennen.
     */
    @Transactional(readOnly = true)
    public List<RoleDto> findAssignableRoles() {
        return roleRepository.findAll().stream()
                .filter(role -> isAdmin() || ROLES_MANAGEABLE_BY_NON_ADMIN.contains(role.getDescription()))
                .map(roleMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<AccountRoleResponseDto> findById(UUID accountId, UUID roleId) {
        return accountRoleRepository.findById(new AccountRoleId(accountId, roleId))
                .filter(ar -> isAdmin() || ar.getAccount().getPerson().getOrganization().getOrganizationId().equals(TenantContext.getOrganizationId()))
                .map(accountRoleMapper::toDto);
    }

    public AccountRoleResponseDto create(UUID accountId, UUID roleId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + accountId));
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Role not found with id: " + roleId));
        if (!isAdmin()) {
            verifyOrganization(account.getPerson().getOrganization().getOrganizationId());
            verifyRoleManageable(role);
        }
        return accountRoleMapper.toDto(accountRoleRepository.save(new AccountRole(account, role)));
    }

    public void deleteById(UUID accountId, UUID roleId) {
        if (!isAdmin()) {
            AccountRole existing = accountRoleRepository.findById(new AccountRoleId(accountId, roleId))
                    .orElseThrow(() -> new RuntimeException("AccountRole not found"));
            verifyOrganization(existing.getAccount().getPerson().getOrganization().getOrganizationId());
            verifyRoleManageable(existing.getRole());
        }
        accountRoleRepository.deleteById(new AccountRoleId(accountId, roleId));
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyRoleManageable(Role role) {
        if (!ROLES_MANAGEABLE_BY_NON_ADMIN.contains(role.getDescription())) {
            throw new AccessDeniedException("Access denied: only an administrator may assign or remove the role " + role.getDescription());
        }
    }

    private void verifyOrganization(UUID organizationId) {
        if (!organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }
}
