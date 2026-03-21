package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.entity.RoleAuthority;
import nl.puurkroatie.rds.auth.entity.RoleAuthorityId;
import nl.puurkroatie.rds.auth.repository.RoleAuthorityRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class RoleAuthorityService {

    private final RoleAuthorityRepository roleAuthorityRepository;

    public RoleAuthorityService(RoleAuthorityRepository roleAuthorityRepository) {
        this.roleAuthorityRepository = roleAuthorityRepository;
    }

    public List<RoleAuthority> findAll() {
        return roleAuthorityRepository.findAll();
    }

    public Optional<RoleAuthority> findById(UUID roleId, UUID authorityId) {
        return roleAuthorityRepository.findById(new RoleAuthorityId(roleId, authorityId));
    }

    public RoleAuthority save(RoleAuthority roleAuthority) {
        return roleAuthorityRepository.save(roleAuthority);
    }

    public void deleteById(UUID roleId, UUID authorityId) {
        roleAuthorityRepository.deleteById(new RoleAuthorityId(roleId, authorityId));
    }
}
