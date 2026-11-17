package nl.puurkroatie.rds.auth.service;

import jakarta.persistence.EntityNotFoundException;
import nl.puurkroatie.rds.auth.dto.AuthorityDto;
import nl.puurkroatie.rds.auth.dto.RoleAuthorityResponseDto;
import nl.puurkroatie.rds.auth.entity.Authority;
import nl.puurkroatie.rds.auth.entity.AuthorizationLog.Action;
import nl.puurkroatie.rds.auth.entity.Role;
import nl.puurkroatie.rds.auth.entity.RoleAuthority;
import nl.puurkroatie.rds.auth.entity.RoleAuthorityId;
import nl.puurkroatie.rds.auth.mapper.RoleMapper;
import nl.puurkroatie.rds.auth.repository.AuthorityRepository;
import nl.puurkroatie.rds.auth.repository.RoleAuthorityRepository;
import nl.puurkroatie.rds.auth.repository.RoleRepository;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.common.ConflictException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Rechten aan een rol geven en afnemen (docs/voorstel-eigen-rollen.md, §4.1, §4.2, §4.5). Alleen voor eigen rollen
 * van de eigen organisatie, onder het eigen niveau, en alleen met rechten die je zelf mag uitdelen (G(u)).
 */
@Service
@Transactional
public class RoleAuthorityService {

    private final RoleAuthorityRepository roleAuthorityRepository;
    private final RoleRepository roleRepository;
    private final AuthorityRepository authorityRepository;
    private final RoleMapper roleMapper;
    private final AuthorizationRules rules;
    private final AuthorizationLogService log;

    public RoleAuthorityService(RoleAuthorityRepository roleAuthorityRepository, RoleRepository roleRepository,
                                AuthorityRepository authorityRepository, RoleMapper roleMapper,
                                AuthorizationRules rules, AuthorizationLogService log) {
        this.roleAuthorityRepository = roleAuthorityRepository;
        this.roleRepository = roleRepository;
        this.authorityRepository = authorityRepository;
        this.roleMapper = roleMapper;
        this.rules = rules;
        this.log = log;
    }

    @Transactional(readOnly = true)
    public List<RoleAuthorityResponseDto> findAll() {
        List<RoleAuthority> links = rules.isPlatformAdmin()
                ? roleAuthorityRepository.findAll()
                : roleAuthorityRepository.findByRoleTenantOrganization(TenantContext.getOrganizationId());
        return links.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Optional<RoleAuthorityResponseDto> findById(UUID roleId, UUID authorityId) {
        return roleAuthorityRepository.findById(new RoleAuthorityId(roleId, authorityId))
                .filter(link -> rules.isPlatformAdmin()
                        || link.getRole().getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(this::toDto);
    }

    /** Voegt de authority toe, met de vereisten die de rol nog niet had (die moet je dan ook zelf mogen uitdelen). */
    public RoleAuthorityResponseDto create(UUID roleId, UUID authorityId) {
        Role role = findChangeableRole(roleId);
        Authority authority = authorityRepository.findById(authorityId)
                .orElseThrow(() -> new EntityNotFoundException("Authority not found with id: " + authorityId));
        Set<String> grantable = rules.grantable();
        Set<String> current = rules.roleAuthorities(roleId);
        if (current.contains(authority.getDescription())) {
            throw new ConflictException("Deze rol heeft het recht " + authority.getDescription() + " al");
        }
        if (!grantable.contains(authority.getDescription())) {
            throw new AccessDeniedException("Je kunt alleen rechten uitdelen die je zelf hebt: " + authority.getDescription());
        }
        List<String> missing = new ArrayList<>(rules.requiredClosure(authority.getDescription(), rules.requirements()));
        missing.removeAll(current);
        if (!grantable.containsAll(missing)) {
            throw new AccessDeniedException("Dit recht vereist rechten die je zelf niet hebt: "
                    + missing.stream().filter(name -> !grantable.contains(name)).toList());
        }

        RoleAuthority saved = roleAuthorityRepository.save(new RoleAuthority(role, authority));
        log.authorityEvent(Action.AUTHORITY_ADDED, role, authority.getDescription(), null);
        for (String name : missing) {
            Authority required = authorityRepository.findByDescription(name).orElseThrow();
            roleAuthorityRepository.save(new RoleAuthority(role, required));
            log.authorityEvent(Action.AUTHORITY_ADDED, role, name, "vereist voor " + authority.getDescription());
        }
        return toDto(saved);
    }

    /** Weigert met 409 als een ander recht in de rol deze authority nodig heeft. */
    public void deleteById(UUID roleId, UUID authorityId) {
        Role role = findChangeableRole(roleId);
        RoleAuthority link = roleAuthorityRepository.findById(new RoleAuthorityId(roleId, authorityId))
                .orElseThrow(() -> new EntityNotFoundException("Role-authority link not found"));
        String name = link.getAuthority().getDescription();
        Map<String, Set<String>> requirements = rules.requirements();
        List<String> dependents = rules.roleAuthorities(roleId).stream()
                .filter(other -> requirements.getOrDefault(other, Set.of()).contains(name))
                .sorted()
                .toList();
        if (!dependents.isEmpty()) {
            throw new ConflictException("Het recht " + name + " is nodig voor " + dependents + "; haal die eerst weg");
        }
        roleAuthorityRepository.delete(link);
        log.authorityEvent(Action.AUTHORITY_REMOVED, role, name, null);
    }

    /** Eigen rol van de eigen organisatie (anders 404), geen systeemrol en onder het eigen niveau (anders 403). */
    private Role findChangeableRole(UUID roleId) {
        Role role = roleRepository.findById(roleId)
                .filter(r -> r.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .orElseThrow(() -> new EntityNotFoundException("Role not found with id: " + roleId));
        if (role.isSystemRole()) {
            throw new AccessDeniedException("Systeemrollen liggen vast");
        }
        if (!rules.grantable().containsAll(rules.roleAuthorities(roleId))) {
            throw new AccessDeniedException("Deze rol bevat rechten die je zelf niet hebt");
        }
        return role;
    }

    private RoleAuthorityResponseDto toDto(RoleAuthority link) {
        Authority authority = link.getAuthority();
        AuthorityDto authorityDto = new AuthorityDto(authority.getAuthorityId(), authority.getDescription(),
                authority.getDomain(), authority.isTenantAssignable(), authority.getIntroducedAt(), List.of());
        return new RoleAuthorityResponseDto(roleMapper.toDto(link.getRole()), authorityDto);
    }
}
