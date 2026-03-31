package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.BookerAddressDto;
import nl.puurkroatie.rds.booking.entity.BookerAddress;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BookerAddressMapper {

    @Mapping(source = "booker.bookerId", target = "bookerId")
    @Mapping(source = "address.addressId", target = "addressId")
    BookerAddressDto toDto(BookerAddress entity);
}
