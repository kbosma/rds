package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.ActivityDto;
import nl.puurkroatie.rds.booking.entity.Activity;
import nl.puurkroatie.rds.booking.entity.ActivityType;
import nl.puurkroatie.rds.booking.mapper.ActivityMapper;
import nl.puurkroatie.rds.booking.repository.ActivityRepository;
import nl.puurkroatie.rds.booking.service.ActivityService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class ActivityServiceImpl implements ActivityService {

    private final ActivityRepository activityRepository;
    private final ActivityMapper activityMapper;

    public ActivityServiceImpl(ActivityRepository activityRepository, ActivityMapper activityMapper) {
        this.activityRepository = activityRepository;
        this.activityMapper = activityMapper;
    }

    @Override
    public ActivityDto create(ActivityDto dto) {
        Activity entity = new Activity(
                dto.getName(),
                dto.getDescription(),
                ActivityType.fromValue(dto.getActivityType())
        );
        Activity saved = activityRepository.save(entity);
        return activityMapper.toDto(saved);
    }

    @Override
    public ActivityDto update(UUID id, ActivityDto dto) {
        Activity existing = activityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activity not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        Activity entity = activityMapper.toEntity(id, dto);
        Activity saved = activityRepository.save(entity);
        return activityMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Activity existing = activityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activity not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        activityRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ActivityDto> findAll() {
        if (isAdmin()) {
            return activityRepository.findAll().stream()
                    .map(activityMapper::toDto)
                    .toList();
        }
        return activityRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(activityMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ActivityDto> findById(UUID id) {
        return activityRepository.findById(id)
                .filter(entity -> isAdmin() || entity.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(activityMapper::toDto);
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }
}
