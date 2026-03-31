package nl.puurkroatie.rds.auth.mapper;

import nl.puurkroatie.rds.auth.dto.PersonDto;
import nl.puurkroatie.rds.auth.entity.Person;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PersonMapper {

    @Mapping(source = "organization.organizationId", target = "organizationId")
    PersonDto toDto(Person entity);
}
