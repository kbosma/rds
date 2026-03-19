package nl.puurkroatie.rds.service.impl;

import nl.puurkroatie.rds.dto.RoleDto;
import nl.puurkroatie.rds.entity.Role;
import nl.puurkroatie.rds.repository.RoleRepository;
import nl.puurkroatie.rds.service.RoleService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;

    public RoleServiceImpl(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Override
    public RoleDto create(RoleDto dto) {
        Role entity = toEntity(dto);
        Role saved = roleRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public RoleDto update(UUID id, RoleDto dto) {
        if (!roleRepository.findById(id).isPresent()) {
            throw new RuntimeException("Role not found with id: " + id);
        }
        Role entity = toEntity(id, dto);
        Role saved = roleRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        if (!roleRepository.existsById(id)) {
            throw new RuntimeException("Role not found with id: " + id);
        }
        roleRepository.deleteById(id);
    }

    @Override
    public List<RoleDto> findAll() {
        return roleRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<RoleDto> findById(UUID id) {
        return roleRepository.findById(id)
                .map(this::toDto);
    }

    private RoleDto toDto(Role entity) {
        return new RoleDto(
                entity.getRoleId(),
                entity.getDescription()
        );
    }

    private Role toEntity(RoleDto dto) {
        return new Role(
                dto.getDescription()
        );
    }

    private Role toEntity(UUID id, RoleDto dto) {
        return new Role(
                id,
                dto.getDescription()
        );
    }
}
