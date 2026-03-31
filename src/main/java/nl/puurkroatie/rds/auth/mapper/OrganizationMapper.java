package nl.puurkroatie.rds.auth.mapper;

import nl.puurkroatie.rds.auth.dto.OrganizationDto;
import nl.puurkroatie.rds.auth.entity.Organization;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface OrganizationMapper {

    OrganizationDto toDto(Organization entity);

    @Mapping(target = "organizationId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "modifiedAt", ignore = true)
    @Mapping(target = "modifiedBy", ignore = true)
    Organization toEntity(OrganizationDto dto);

    default Organization toEntity(UUID id, OrganizationDto dto) {
        return new Organization(id, dto.getName(), dto.getMollieKey());
    }
}