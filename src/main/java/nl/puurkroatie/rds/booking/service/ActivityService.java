package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.ActivityDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActivityService {

    ActivityDto create(ActivityDto dto);

    ActivityDto update(UUID id, ActivityDto dto);

    void delete(UUID id);

    List<ActivityDto> findAll();

    Optional<ActivityDto> findById(UUID id);
}
