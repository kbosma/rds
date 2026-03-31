package nl.puurkroatie.rds.auth.config;

import java.time.LocalDateTime;

public class ErrorResponse {

    private final String message;
    private final LocalDateTime timestamp;
    private final int status;

    public ErrorResponse(String message, LocalDateTime timestamp, int status) {
        this.message = message;
        this.timestamp = timestamp;
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public int getStatus() {
        return status;
    }
}
