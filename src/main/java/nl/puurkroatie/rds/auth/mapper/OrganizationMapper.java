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

    default Organization toEntity(UUID id, OrganizationDto dto, Organization existing) {
        // mollieKey wordt niet door het organisatie-formulier beheerd en wordt dus
        // niet altijd meegestuurd. Behoud de bestaande waarde wanneer de DTO hem
        // niet bevat, anders zou een update (bv. het instellen van emailFrom) de
        // mollie-key wissen. name en emailFrom worden wel door het formulier
        // beheerd en worden daarom overgenomen zoals aangeleverd.
        String mollieKey = dto.getMollieKey() != null ? dto.getMollieKey() : existing.getMollieKey();
        return new Organization(id, dto.getName(), mollieKey, dto.getEmailFrom(),
                existing.getCreatedAt(), existing.getCreatedBy());
    }
}