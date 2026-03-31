package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.BookingMolliePaymentDto;
import nl.puurkroatie.rds.booking.entity.BookingMolliePayment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BookingMolliePaymentMapper {

    @Mapping(source = "booking.bookingId", target = "bookingId")
    @Mapping(source = "molliePayment.molliePaymentId", target = "molliePaymentId")
    BookingMolliePaymentDto toDto(BookingMolliePayment entity);
}
