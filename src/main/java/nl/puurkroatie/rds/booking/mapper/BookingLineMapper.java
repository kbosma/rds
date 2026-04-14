package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.BookingLineDto;
import nl.puurkroatie.rds.booking.entity.BookingLine;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BookingLineMapper {

    @Mapping(source = "bookingLineId", target = "bookingLineId")
    @Mapping(source = "booking.bookingId", target = "bookingId")
    @Mapping(source = "accommodation.accommodationId", target = "accommodationId")
    @Mapping(source = "supplier.supplierId", target = "supplierId")
    @Mapping(source = "accommodation.name", target = "accommodationName")
    @Mapping(source = "supplier.name", target = "supplierName")
    BookingLineDto toDto(BookingLine entity);
}
