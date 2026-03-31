package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.AccommodationDto;
import nl.puurkroatie.rds.booking.entity.Accommodation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface AccommodationMapper {

    AccommodationDto toDto(Accommodation entity);

    @Mapping(target = "accommodationId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "modifiedAt", ignore = true)
    @Mapping(target = "modifiedBy", ignore = true)
    @Mapping(target = "tenantOrganization", ignore = true)
    Accommodation toEntity(AccommodationDto dto);

    default Accommodation toEntity(UUID id, AccommodationDto dto) {
        return new Accommodation(id, dto.getKey(), dto.getName());
    }
}
