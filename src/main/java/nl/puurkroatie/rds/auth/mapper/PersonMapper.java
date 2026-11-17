package nl.puurkroatie.rds.auth.mapper;

import nl.puurkroatie.rds.auth.dto.PersonDto;
import nl.puurkroatie.rds.auth.entity.Person;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PersonMapper {

    @Mapping(source = "tenantOrganization.organizationId", target = "tenantOrganization")
    PersonDto toDto(Person entity);
}
