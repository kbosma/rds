package nl.puurkroatie.rds.auth.mapper;

import nl.puurkroatie.rds.auth.dto.RoleDto;
import nl.puurkroatie.rds.auth.entity.Role;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface RoleMapper {

    RoleDto toDto(Role entity);

    @Mapping(target = "roleId", ignore = true)
    Role toEntity(RoleDto dto);

    default Role toEntity(UUID id, RoleDto dto) {
        return new Role(id, dto.getDescription());
    }
}
