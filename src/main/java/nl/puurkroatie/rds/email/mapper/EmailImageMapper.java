package nl.puurkroatie.rds.email.mapper;

import nl.puurkroatie.rds.email.dto.EmailImageDto;
import nl.puurkroatie.rds.email.entity.EmailImage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface EmailImageMapper {

    @Mapping(target = "url",
            expression = "java(nl.puurkroatie.rds.email.service.EmailImageUrlResolver.publicPath(entity.getEmailImageId()))")
    EmailImageDto toDto(EmailImage entity);
}
