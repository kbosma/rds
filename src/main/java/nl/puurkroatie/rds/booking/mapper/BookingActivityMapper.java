package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.BookingActivityDto;
import nl.puurkroatie.rds.booking.entity.BookingActivity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BookingActivityMapper {

    @Mapping(source = "booking.bookingId", target = "bookingId")
    @Mapping(source = "activity.activityId", target = "activityId")
    @Mapping(source = "activity.name", target = "activityName")
    @Mapping(source = "activity.activityType", target = "activityType")
    BookingActivityDto toDto(BookingActivity entity);
}
