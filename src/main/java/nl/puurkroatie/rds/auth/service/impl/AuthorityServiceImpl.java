package nl.puurkroatie.rds.auth.service.impl;

import nl.puurkroatie.rds.auth.dto.AuthorityDto;
import nl.puurkroatie.rds.auth.entity.Authority;
import nl.puurkroatie.rds.auth.repository.AuthorityRepository;
import nl.puurkroatie.rds.auth.service.AuthorityService;
import nl.puurkroatie.rds.auth.service.AuthorizationRules;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class AuthorityServiceImpl implements AuthorityService {

    private final AuthorityRepository authorityRepository;
    private final AuthorizationRules rules;

    public AuthorityServiceImpl(AuthorityRepository authorityRepository, AuthorizationRules rules) {
        this.authorityRepository = authorityRepository;
        this.rules = rules;
    }

    @Override
    public List<AuthorityDto> findAll() {
        Map<String, Set<String>> requirements = rules.requirements();
        return authorityRepository.findAllByOrderByDomainAscDescriptionAsc().stream()
                .map(authority -> toDto(authority, requirements))
                .toList();
    }

    @Override
    public Optional<AuthorityDto> findById(UUID id) {
        Map<String, Set<String>> requirements = rules.requirements();
        return authorityRepository.findById(id).map(authority -> toDto(authority, requirements));
    }

    @Override
    public List<AuthorityDto> findGrantable() {
        Set<String> grantable = rules.grantable();
        return findAll().stream().filter(authority -> grantable.contains(authority.description())).toList();
    }

    private static AuthorityDto toDto(Authority authority, Map<String, Set<String>> requirements) {
        List<String> requires = requirements.getOrDefault(authority.getDescription(), Set.of()).stream().sorted().toList();
        return new AuthorityDto(authority.getAuthorityId(), authority.getDescription(), authority.getDomain(),
                authority.isTenantAssignable(), authority.getIntroducedAt(), requires);
    }
}
