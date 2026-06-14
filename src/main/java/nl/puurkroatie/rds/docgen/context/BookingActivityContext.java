package nl.puurkroatie.rds.docgen.context;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class BookingActivityContext {

    private String activityName;
    private String activityType;
    private LocalDateTime fromDate;
    private LocalDateTime untilDate;
    private String meetingPoint;
    private BigDecimal totalPrice;

    public BookingActivityContext(String activityName, String activityType, LocalDateTime fromDate, LocalDateTime untilDate, String meetingPoint, BigDecimal totalPrice) {
        this.activityName = activityName;
        this.activityType = activityType;
        this.fromDate = fromDate;
        this.untilDate = untilDate;
        this.meetingPoint = meetingPoint;
        this.totalPrice = totalPrice;
    }

    public String getActivityName() {
        return activityName;
    }

    public String getActivityType() {
        return activityType;
    }

    public LocalDateTime getFromDate() {
        return fromDate;
    }

    public LocalDateTime getUntilDate() {
        return untilDate;
    }

    public String getMeetingPoint() {
        return meetingPoint;
    }

    public BigDecimal getTotalPrice() {
        return totalPrice;
    }
}
