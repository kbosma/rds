package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.ActivityDto;
import nl.puurkroatie.rds.booking.entity.Activity;
import nl.puurkroatie.rds.booking.entity.ActivityType;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface ActivityMapper {

    @Mapping(target = "activityType", expression = "java(entity.getActivityType().toValue())")
    ActivityDto toDto(Activity entity);

    @Mapping(target = "activityId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "modifiedAt", ignore = true)
    @Mapping(target = "modifiedBy", ignore = true)
    @Mapping(target = "tenantOrganization", ignore = true)
    @Mapping(target = "activityType", expression = "java(nl.puurkroatie.rds.booking.entity.ActivityType.fromValue(dto.getActivityType()))")
    Activity toEntity(ActivityDto dto);

    default Activity toEntity(UUID id, ActivityDto dto) {
        return new Activity(id, dto.getName(), dto.getDescription(), ActivityType.fromValue(dto.getActivityType()));
    }
}
