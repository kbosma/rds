package nl.puurkroatie.rds.settings.mapper;

import nl.puurkroatie.rds.settings.dto.OrganizationSettingsDto;
import nl.puurkroatie.rds.settings.entity.OrganizationSettings;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface OrganizationSettingsMapper {

    OrganizationSettingsDto toDto(OrganizationSettings entity);
}
