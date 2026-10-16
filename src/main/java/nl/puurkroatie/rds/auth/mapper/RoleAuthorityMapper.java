package nl.puurkroatie.rds.auth.mapper;

import nl.puurkroatie.rds.auth.dto.RoleAuthorityResponseDto;
import nl.puurkroatie.rds.auth.entity.RoleAuthority;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", uses = {RoleMapper.class, AuthorityMapper.class})
public interface RoleAuthorityMapper {

    RoleAuthorityResponseDto toDto(RoleAuthority entity);
}
