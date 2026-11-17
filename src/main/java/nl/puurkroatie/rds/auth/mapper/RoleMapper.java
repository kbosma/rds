package nl.puurkroatie.rds.auth.mapper;

import nl.puurkroatie.rds.auth.dto.RoleDto;
import nl.puurkroatie.rds.auth.entity.Role;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface RoleMapper {

    /** Zonder oordeel over wijzigbaarheid ({@code editable} leeg); de service vult dat in waar het ertoe doet. */
    @Mapping(target = "editable", ignore = true)
    RoleDto toDto(Role entity);
}
