package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.DocumentDto;
import nl.puurkroatie.rds.booking.entity.Document;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface DocumentMapper {

    @Mapping(source = "booking.bookingId", target = "bookingId")
    DocumentDto toDto(Document entity);
}
