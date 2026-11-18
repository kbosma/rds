package nl.puurkroatie.rds.auth.service.impl;

import jakarta.persistence.EntityNotFoundException;
import nl.puurkroatie.rds.auth.dto.AuthorityDto;
import nl.puurkroatie.rds.auth.dto.RoleDto;
import nl.puurkroatie.rds.auth.entity.AuthorizationLog.Action;
import nl.puurkroatie.rds.auth.entity.Organization;
import nl.puurkroatie.rds.auth.entity.Role;
import nl.puurkroatie.rds.auth.entity.RoleAuthority;
import nl.puurkroatie.rds.auth.mapper.RoleMapper;
import nl.puurkroatie.rds.auth.repository.AccountRoleRepository;
import nl.puurkroatie.rds.auth.repository.AuthorityRepository;
import nl.puurkroatie.rds.auth.repository.OrganizationRepository;
import nl.puurkroatie.rds.auth.repository.RoleAuthorityRepository;
import nl.puurkroatie.rds.auth.repository.RoleRepository;
import nl.puurkroatie.rds.auth.security.Authorities;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.auth.service.AuthorityService;
import nl.puurkroatie.rds.auth.service.AuthorizationLogService;
import nl.puurkroatie.rds.auth.service.AuthorizationRules;
import nl.puurkroatie.rds.auth.service.RoleAuthorityService;
import nl.puurkroatie.rds.auth.service.RoleService;
import nl.puurkroatie.rds.auth.service.SystemRoles;
import nl.puurkroatie.rds.common.ConflictException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
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
    private final RoleAuthorityRepository roleAuthorityRepository;
    private final AuthorityRepository authorityRepository;
    private final OrganizationRepository organizationRepository;
    private final AuthorityService authorityService;
    private final RoleAuthorityService roleAuthorityService;
    private final Clock clock;

    public RoleServiceImpl(RoleRepository roleRepository, AccountRoleRepository accountRoleRepository, RoleMapper roleMapper,
                           AuthorizationRules rules, AuthorizationLogService log, RoleAuthorityRepository roleAuthorityRepository,
                           AuthorityRepository authorityRepository, OrganizationRepository organizationRepository,
                           AuthorityService authorityService, RoleAuthorityService roleAuthorityService, Clock clock) {
        this.roleRepository = roleRepository;
        this.accountRoleRepository = accountRoleRepository;
        this.roleMapper = roleMapper;
        this.rules = rules;
        this.log = log;
        this.roleAuthorityRepository = roleAuthorityRepository;
        this.authorityRepository = authorityRepository;
        this.organizationRepository = organizationRepository;
        this.authorityService = authorityService;
        this.roleAuthorityService = roleAuthorityService;
        this.clock = clock;
    }

    @Override
    public RoleDto create(RoleDto dto, UUID copyFromRoleId) {
        UUID organization = TenantContext.getOrganizationId();
        String name = dto.getDescription().trim();
        verifyNameAvailable(organization, name);
        Set<String> grantable = rules.grantable();

        Role source = null;
        Set<String> copied = Set.of();
        if (copyFromRoleId != null) {
            source = roleRepository.findById(copyFromRoleId)
                    .filter(r -> r.getTenantOrganization().equals(organization))
                    .orElseThrow(() -> new EntityNotFoundException("Role not found with id: " + copyFromRoleId));
            copied = rules.roleAuthorities(source.getRoleId());
            if (!grantable.containsAll(copied)) {
                throw new AccessDeniedException("Deze rol bevat rechten die je zelf niet hebt; kopiëren kan daarom niet");
            }
        }

        Role saved = roleRepository.save(new Role(name, organization));
        log.roleEvent(Action.ROLE_CREATED, saved, source == null ? null : "kopie van " + source.getDescription());
        for (String authority : copied.stream().sorted().toList()) {
            roleAuthorityRepository.save(new RoleAuthority(saved, authorityRepository.findByDescription(authority).orElseThrow()));
            log.authorityEvent(Action.AUTHORITY_ADDED, saved, authority, "gekopieerd van " + source.getDescription());
        }
        if (dto.getAuthorities() != null) {
            roleAuthorityService.replaceAuthorities(saved.getRoleId(), new HashSet<>(dto.getAuthorities()));
        }
        return toDto(saved, grantable);
    }

    @Override
    public RoleDto update(UUID id, RoleDto dto) {
        Role role = findEditable(id);
        String name = dto.getDescription().trim();
        boolean renamed = !name.equals(role.getDescription());
        // Eerst alles controleren, dan pas schrijven: de naam vóór de rechten, de hernoeming als laatste.
        if (renamed) {
            if (!TenantContext.hasAuthority(Authorities.ROLE_UPDATE)) {
                throw new AccessDeniedException("Je mag rollen niet hernoemen");
            }
            if (!name.equalsIgnoreCase(role.getDescription())) {
                verifyNameAvailable(role.getTenantOrganization(), name);
            }
        }
        if (dto.getAuthorities() != null) {
            roleAuthorityService.replaceAuthorities(id, new HashSet<>(dto.getAuthorities()));
        }
        if (renamed) {
            String oldName = role.getDescription();
            role = roleRepository.save(role.renamed(name));
            log.roleEvent(Action.ROLE_RENAMED, role, oldName + " → " + name);
        }
        return toDto(role, rules.grantable());
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

    @Override
    @Transactional(readOnly = true)
    public List<AuthorityDto> findNewAuthorities() {
        Organization organization = organizationRepository.findById(TenantContext.getOrganizationId()).orElseThrow();
        LocalDate seenUntil = (organization.getRolesReviewedAt() != null ? organization.getRolesReviewedAt() : organization.getCreatedAt())
                .toLocalDate();
        return authorityService.findAll().stream()
                .filter(AuthorityDto::tenantAssignable)
                .filter(authority -> authority.introducedAt().isAfter(seenUntil))
                .toList();
    }

    @Override
    public void markNewAuthoritiesSeen() {
        organizationRepository.markRolesReviewed(TenantContext.getOrganizationId(), LocalDateTime.now(clock));
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
        return roleMapper.toDto(role).withEditable(rules.isEditable(role, grantable), accountRoleRepository.countByRole(role));
    }
}
