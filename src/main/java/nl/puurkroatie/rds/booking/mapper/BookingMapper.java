package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.BookingDto;
import nl.puurkroatie.rds.booking.entity.Booking;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BookingMapper {

    @Mapping(source = "booker.bookerId", target = "bookerId")
    @Mapping(target = "bookingStatus", expression = "java(entity.getBookingStatus() != null ? entity.getBookingStatus().toValue() : null)")
    BookingDto toDto(Booking entity);
}
