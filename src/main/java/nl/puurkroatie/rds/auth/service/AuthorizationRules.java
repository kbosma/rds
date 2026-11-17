package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.entity.Role;
import nl.puurkroatie.rds.auth.repository.AuthorityRepository;
import nl.puurkroatie.rds.auth.security.Authorities;
import nl.puurkroatie.rds.auth.security.TenantContext;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * De regels voor het uitdelen van rechten (docs/voorstel-eigen-rollen.md, §4).
 *
 * <ul>
 *   <li><b>E(u)</b>: de effectieve authorities van een account, uit de database (niet uit het token, dat kan verouderd
 *       zijn);</li>
 *   <li><b>T</b>: de authorities die een klantorganisatie mag uitdelen ({@code tenant_assignable});</li>
 *   <li><b>G(u) = E(u) ∩ T</b>: wat de ingelogde gebruiker mag uitdelen;</li>
 *   <li>een rol of account ligt "onder je niveau" als al zijn authorities in G(u) zitten.</li>
 * </ul>
 */
@Component
public class AuthorizationRules {

    private final AuthorityRepository authorityRepository;

    public AuthorizationRules(AuthorityRepository authorityRepository) {
        this.authorityRepository = authorityRepository;
    }

    public boolean isPlatformAdmin() {
        return TenantContext.hasAuthority(Authorities.PLATFORM_ADMIN);
    }

    public Set<String> effectiveAuthorities(UUID accountId) {
        return authorityRepository.findEffectiveNamesByAccount(accountId);
    }

    /** G(u) voor de ingelogde gebruiker. */
    public Set<String> grantable() {
        Set<String> grantable = new HashSet<>(effectiveAuthorities(TenantContext.getAccountId()));
        grantable.retainAll(authorityRepository.findTenantAssignableNames());
        return grantable;
    }

    public Set<String> roleAuthorities(UUID roleId) {
        return authorityRepository.findNamesByRole(roleId);
    }

    /** Mag de ingelogde gebruiker deze rol wijzigen: eigen rol van de eigen organisatie, onder zijn niveau. */
    public boolean isEditable(Role role, Set<String> grantable) {
        return !role.isSystemRole()
                && role.getTenantOrganization().equals(TenantContext.getOrganizationId())
                && grantable.containsAll(roleAuthorities(role.getRoleId()));
    }

    /** Authority → de authorities die hij direct nodig heeft. */
    public Map<String, Set<String>> requirements() {
        Map<String, Set<String>> requirements = new HashMap<>();
        for (Object[] pair : authorityRepository.findRequirementPairs()) {
            requirements.computeIfAbsent((String) pair[0], key -> new LinkedHashSet<>()).add((String) pair[1]);
        }
        return requirements;
    }

    /** Alle authorities die {@code authority} direct of indirect nodig heeft (zonder de authority zelf). */
    public Set<String> requiredClosure(String authority, Map<String, Set<String>> requirements) {
        Set<String> closure = new LinkedHashSet<>();
        Deque<String> todo = new ArrayDeque<>(requirements.getOrDefault(authority, Set.of()));
        while (!todo.isEmpty()) {
            String next = todo.pop();
            if (closure.add(next)) {
                todo.addAll(requirements.getOrDefault(next, Set.of()));
            }
        }
        closure.remove(authority);
        return closure;
    }
}
