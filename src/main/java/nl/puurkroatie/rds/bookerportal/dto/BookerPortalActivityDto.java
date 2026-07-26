package nl.puurkroatie.rds.bookerportal.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class BookerPortalActivityDto {

    private UUID activityId;
    private String name;
    private String description;
    private LocalDateTime fromDate;
    private LocalDateTime untilDate;
    private String location;
    private String activityType;

    public BookerPortalActivityDto(UUID activityId, String name, String description,
                                   LocalDateTime fromDate, LocalDateTime untilDate,
                                   String location, String activityType) {
        this.activityId = activityId;
        this.name = name;
        this.description = description;
        this.fromDate = fromDate;
        this.untilDate = untilDate;
        this.location = location;
        this.activityType = activityType;
    }

    public UUID getActivityId() { return activityId; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public LocalDateTime getFromDate() { return fromDate; }
    public LocalDateTime getUntilDate() { return untilDate; }
    public String getLocation() { return location; }
    public String getActivityType() { return activityType; }
}
