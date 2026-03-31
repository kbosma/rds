package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.AccommodationAddressDto;
import nl.puurkroatie.rds.booking.entity.AccommodationAddress;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AccommodationAddressMapper {

    @Mapping(source = "accommodation.accommodationId", target = "accommodationId")
    @Mapping(source = "address.addressId", target = "addressId")
    AccommodationAddressDto toDto(AccommodationAddress entity);
}
