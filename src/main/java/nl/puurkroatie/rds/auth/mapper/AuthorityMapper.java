package nl.puurkroatie.rds.auth.mapper;

import nl.puurkroatie.rds.auth.dto.AuthorityDto;
import nl.puurkroatie.rds.auth.entity.Authority;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface AuthorityMapper {

    AuthorityDto toDto(Authority entity);

    @Mapping(target = "authorityId", ignore = true)
    Authority toEntity(AuthorityDto dto);

    default Authority toEntity(UUID id, AuthorityDto dto) {
        return new Authority(id, dto.getDescription());
    }
}
