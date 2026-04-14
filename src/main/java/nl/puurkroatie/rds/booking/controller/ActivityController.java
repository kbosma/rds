package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.booking.dto.ActivityDto;
import nl.puurkroatie.rds.booking.service.ActivityService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/activities")
public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ACTIVITY_READ')")
    public List<ActivityDto> findAll() {
        return activityService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ACTIVITY_READ')")
    public ResponseEntity<ActivityDto> findById(@PathVariable UUID id) {
        return activityService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ACTIVITY_CREATE')")
    public ResponseEntity<ActivityDto> create(@RequestBody @Valid ActivityDto dto) {
        ActivityDto created = activityService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ACTIVITY_UPDATE')")
    public ResponseEntity<ActivityDto> update(@PathVariable UUID id, @RequestBody @Valid ActivityDto dto) {
        ActivityDto updated = activityService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ACTIVITY_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        activityService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
