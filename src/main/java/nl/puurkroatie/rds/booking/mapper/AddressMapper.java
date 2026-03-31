package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.AddressDto;
import nl.puurkroatie.rds.booking.entity.Address;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AddressMapper {

    @Mapping(target = "addressrole", expression = "java(entity.getAddressrole() != null ? entity.getAddressrole().toValue() : null)")
    AddressDto toDto(Address entity);
}
