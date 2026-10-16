package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.dto.RoleAuthorityResponseDto;
import nl.puurkroatie.rds.auth.entity.Authority;
import nl.puurkroatie.rds.auth.entity.Role;
import nl.puurkroatie.rds.auth.entity.RoleAuthority;
import nl.puurkroatie.rds.auth.entity.RoleAuthorityId;
import nl.puurkroatie.rds.auth.mapper.RoleAuthorityMapper;
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
    private final RoleAuthorityMapper roleAuthorityMapper;

    public RoleAuthorityService(RoleAuthorityRepository roleAuthorityRepository, RoleRepository roleRepository,
                                AuthorityRepository authorityRepository, RoleAuthorityMapper roleAuthorityMapper) {
        this.roleAuthorityRepository = roleAuthorityRepository;
        this.roleRepository = roleRepository;
        this.authorityRepository = authorityRepository;
        this.roleAuthorityMapper = roleAuthorityMapper;
    }

    @Transactional(readOnly = true)
    public List<RoleAuthorityResponseDto> findAll() {
        return roleAuthorityRepository.findAll().stream().map(roleAuthorityMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Optional<RoleAuthorityResponseDto> findById(UUID roleId, UUID authorityId) {
        return roleAuthorityRepository.findById(new RoleAuthorityId(roleId, authorityId))
                .map(roleAuthorityMapper::toDto);
    }

    public RoleAuthorityResponseDto create(UUID roleId, UUID authorityId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Role not found with id: " + roleId));
        Authority authority = authorityRepository.findById(authorityId)
                .orElseThrow(() -> new RuntimeException("Authority not found with id: " + authorityId));
        return roleAuthorityMapper.toDto(roleAuthorityRepository.save(new RoleAuthority(role, authority)));
    }

    public void deleteById(UUID roleId, UUID authorityId) {
        roleAuthorityRepository.deleteById(new RoleAuthorityId(roleId, authorityId));
    }
}
