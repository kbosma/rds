package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.TravelerDto;
import nl.puurkroatie.rds.booking.entity.Traveler;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TravelerMapper {

    @Mapping(source = "booking.bookingId", target = "bookingId")
    @Mapping(target = "gender", expression = "java(entity.getGender() != null ? entity.getGender().toValue() : null)")
    TravelerDto toDto(Traveler entity);
}
