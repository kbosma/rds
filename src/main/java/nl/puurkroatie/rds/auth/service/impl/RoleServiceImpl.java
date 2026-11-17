package nl.puurkroatie.rds.auth.service.impl;

import jakarta.persistence.EntityNotFoundException;
import nl.puurkroatie.rds.auth.dto.RoleDto;
import nl.puurkroatie.rds.auth.entity.AuthorizationLog.Action;
import nl.puurkroatie.rds.auth.entity.Role;
import nl.puurkroatie.rds.auth.mapper.RoleMapper;
import nl.puurkroatie.rds.auth.repository.AccountRoleRepository;
import nl.puurkroatie.rds.auth.repository.RoleRepository;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.auth.service.AuthorizationLogService;
import nl.puurkroatie.rds.auth.service.AuthorizationRules;
import nl.puurkroatie.rds.auth.service.RoleService;
import nl.puurkroatie.rds.auth.service.SystemRoles;
import nl.puurkroatie.rds.common.ConflictException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final AccountRoleRepository accountRoleRepository;
    private final RoleMapper roleMapper;
    private final AuthorizationRules rules;
    private final AuthorizationLogService log;

    public RoleServiceImpl(RoleRepository roleRepository, AccountRoleRepository accountRoleRepository, RoleMapper roleMapper,
                           AuthorizationRules rules, AuthorizationLogService log) {
        this.roleRepository = roleRepository;
        this.accountRoleRepository = accountRoleRepository;
        this.roleMapper = roleMapper;
        this.rules = rules;
        this.log = log;
    }

    @Override
    public RoleDto create(RoleDto dto) {
        UUID organization = TenantContext.getOrganizationId();
        String name = dto.getDescription().trim();
        verifyNameAvailable(organization, name);
        Role saved = roleRepository.save(new Role(name, organization));
        log.roleEvent(Action.ROLE_CREATED, saved, null);
        return toDto(saved, rules.grantable());
    }

    @Override
    public RoleDto update(UUID id, RoleDto dto) {
        Role existing = findEditable(id);
        String name = dto.getDescription().trim();
        if (!name.equalsIgnoreCase(existing.getDescription())) {
            verifyNameAvailable(existing.getTenantOrganization(), name);
        }
        Role saved = roleRepository.save(existing.renamed(name));
        log.roleEvent(Action.ROLE_RENAMED, saved, existing.getDescription() + " → " + name);
        return toDto(saved, rules.grantable());
    }

    @Override
    public void delete(UUID id) {
        Role existing = findEditable(id);
        long accounts = accountRoleRepository.countByRole(existing);
        if (accounts > 0) {
            throw new ConflictException("Deze rol is nog toegewezen aan " + accounts + " account(s); trek hem eerst in");
        }
        log.roleEvent(Action.ROLE_DELETED, existing, null);
        roleRepository.delete(existing);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoleDto> findAll(UUID organizationId) {
        List<Role> roles;
        if (rules.isPlatformAdmin()) {
            roles = organizationId != null
                    ? roleRepository.findByTenantOrganizationOrderByDescription(organizationId)
                    : roleRepository.findAll();
        } else {
            roles = roleRepository.findByTenantOrganizationOrderByDescription(TenantContext.getOrganizationId());
        }
        Set<String> grantable = rules.grantable();
        return roles.stream().map(role -> toDto(role, grantable)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RoleDto> findById(UUID id) {
        return roleRepository.findById(id)
                .filter(this::isVisible)
                .map(role -> toDto(role, rules.grantable()));
    }

    private boolean isVisible(Role role) {
        return rules.isPlatformAdmin() || role.getTenantOrganization().equals(TenantContext.getOrganizationId());
    }

    /**
     * Alleen een eigen rol van de eigen organisatie, onder het eigen niveau. Een rol van een andere organisatie is
     * "niet gevonden" (404), zodat er niets lekt; ook een beheerder wijzigt geen rollen van een klant.
     */
    private Role findEditable(UUID id) {
        Role role = roleRepository.findById(id)
                .filter(r -> r.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .orElseThrow(() -> new EntityNotFoundException("Role not found with id: " + id));
        if (role.isSystemRole()) {
            throw new AccessDeniedException("Systeemrollen liggen vast");
        }
        if (!rules.grantable().containsAll(rules.roleAuthorities(role.getRoleId()))) {
            throw new AccessDeniedException("Deze rol bevat rechten die je zelf niet hebt");
        }
        return role;
    }

    private void verifyNameAvailable(UUID organization, String name) {
        if (SystemRoles.NAMES.stream().anyMatch(name::equalsIgnoreCase)) {
            throw new ConflictException("De naam " + name + " is gereserveerd voor een systeemrol");
        }
        if (roleRepository.existsByTenantOrganizationAndDescriptionIgnoreCase(organization, name)) {
            throw new ConflictException("Er bestaat al een rol met de naam " + name);
        }
    }

    private RoleDto toDto(Role role, Set<String> grantable) {
        return roleMapper.toDto(role).withEditable(rules.isEditable(role, grantable));
    }
}
