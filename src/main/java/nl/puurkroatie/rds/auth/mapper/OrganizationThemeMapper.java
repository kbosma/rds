package nl.puurkroatie.rds.auth.mapper;

import nl.puurkroatie.rds.auth.dto.OrganizationThemeDto;
import nl.puurkroatie.rds.auth.entity.Organization;
import nl.puurkroatie.rds.auth.entity.OrganizationTheme;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface OrganizationThemeMapper {

    @Mapping(target = "organizationId", source = "organization.organizationId")
    OrganizationThemeDto toDto(OrganizationTheme entity);

    @Mapping(target = "organizationThemeId", ignore = true)
    @Mapping(target = "organization", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "modifiedAt", ignore = true)
    @Mapping(target = "modifiedBy", ignore = true)
    OrganizationTheme toEntity(OrganizationThemeDto dto);

    default OrganizationTheme toEntity(UUID id, OrganizationThemeDto dto, Organization organization) {
        return new OrganizationTheme(id, organization, dto.getPrimaryColor(), dto.getAccentColor(), dto.getLogoUrl());
    }
}
