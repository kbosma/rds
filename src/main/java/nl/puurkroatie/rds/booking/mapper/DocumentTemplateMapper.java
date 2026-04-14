package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.DocumentTemplateDto;
import nl.puurkroatie.rds.booking.entity.DocumentTemplate;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DocumentTemplateMapper {

    DocumentTemplateDto toDto(DocumentTemplate entity);
}
