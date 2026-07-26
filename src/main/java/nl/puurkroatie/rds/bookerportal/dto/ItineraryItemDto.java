package nl.puurkroatie.rds.bookerportal.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class ItineraryItemDto {

    public enum ItemType { ACCOMMODATION, ACTIVITY }

    private UUID itineraryItemId;
    private ItemType type;
    private String description;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String location;

    public ItineraryItemDto(UUID itineraryItemId, ItemType type, String description,
                            LocalDateTime startDate, LocalDateTime endDate, String location) {
        this.itineraryItemId = itineraryItemId;
        this.type = type;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
        this.location = location;
    }

    public UUID getItineraryItemId() { return itineraryItemId; }
    public ItemType getType() { return type; }
    public String getDescription() { return description; }
    public LocalDateTime getStartDate() { return startDate; }
    public LocalDateTime getEndDate() { return endDate; }
    public String getLocation() { return location; }
}
