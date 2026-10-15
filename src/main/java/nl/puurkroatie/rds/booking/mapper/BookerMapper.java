package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.BookerDto;
import nl.puurkroatie.rds.booking.entity.Booker;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BookerMapper {

    @Mapping(target = "gender", expression = "java(entity.getGender() != null ? entity.getGender().toValue() : null)")
    @Mapping(target = "status", expression = "java(entity.getStatus() != null ? entity.getStatus().toValue() : null)")
    BookerDto toDto(Booker entity);
}
