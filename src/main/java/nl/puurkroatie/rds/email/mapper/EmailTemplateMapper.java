package nl.puurkroatie.rds.email.mapper;

import nl.puurkroatie.rds.email.dto.EmailTemplateDto;
import nl.puurkroatie.rds.email.entity.EmailTemplate;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface EmailTemplateMapper {

    EmailTemplateDto toDto(EmailTemplate entity);
}
