package nl.puurkroatie.rds.auth.service.impl;

import nl.puurkroatie.rds.auth.dto.RoleDto;
import nl.puurkroatie.rds.auth.entity.Role;
import nl.puurkroatie.rds.auth.mapper.RoleMapper;
import nl.puurkroatie.rds.auth.repository.RoleRepository;
import nl.puurkroatie.rds.auth.service.RoleService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final RoleMapper roleMapper;

    public RoleServiceImpl(RoleRepository roleRepository, RoleMapper roleMapper) {
        this.roleRepository = roleRepository;
        this.roleMapper = roleMapper;
    }

    @Override
    public RoleDto create(RoleDto dto) {
        Role entity = roleMapper.toEntity(dto);
        Role saved = roleRepository.save(entity);
        return roleMapper.toDto(saved);
    }

    @Override
    public RoleDto update(UUID id, RoleDto dto) {
        if (!roleRepository.findById(id).isPresent()) {
            throw new RuntimeException("Role not found with id: " + id);
        }
        Role entity = roleMapper.toEntity(id, dto);
        Role saved = roleRepository.save(entity);
        return roleMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        if (!roleRepository.existsById(id)) {
            throw new RuntimeException("Role not found with id: " + id);
        }
        roleRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoleDto> findAll() {
        return roleRepository.findAll().stream()
                .map(roleMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RoleDto> findById(UUID id) {
        return roleRepository.findById(id)
                .map(roleMapper::toDto);
    }
}
