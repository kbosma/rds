package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.entity.Authority;
import nl.puurkroatie.rds.auth.entity.Role;
import nl.puurkroatie.rds.auth.entity.RoleAuthority;
import nl.puurkroatie.rds.auth.entity.RoleAuthorityId;
import nl.puurkroatie.rds.auth.repository.AuthorityRepository;
import nl.puurkroatie.rds.auth.repository.RoleAuthorityRepository;
import nl.puurkroatie.rds.auth.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class RoleAuthorityService {

    private final RoleAuthorityRepository roleAuthorityRepository;
    private final RoleRepository roleRepository;
    private final AuthorityRepository authorityRepository;

    public RoleAuthorityService(RoleAuthorityRepository roleAuthorityRepository, RoleRepository roleRepository, AuthorityRepository authorityRepository) {
        this.roleAuthorityRepository = roleAuthorityRepository;
        this.roleRepository = roleRepository;
        this.authorityRepository = authorityRepository;
    }

    @Transactional(readOnly = true)
    public List<RoleAuthority> findAll() {
        return roleAuthorityRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<RoleAuthority> findById(UUID roleId, UUID authorityId) {
        return roleAuthorityRepository.findById(new RoleAuthorityId(roleId, authorityId));
    }

    public RoleAuthority create(UUID roleId, UUID authorityId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Role not found with id: " + roleId));
        Authority authority = authorityRepository.findById(authorityId)
                .orElseThrow(() -> new RuntimeException("Authority not found with id: " + authorityId));
        return roleAuthorityRepository.save(new RoleAuthority(role, authority));
    }

    public void deleteById(UUID roleId, UUID authorityId) {
        roleAuthorityRepository.deleteById(new RoleAuthorityId(roleId, authorityId));
    }
}
