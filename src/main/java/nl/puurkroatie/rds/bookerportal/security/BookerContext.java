package nl.puurkroatie.rds.bookerportal.security;

import java.util.UUID;

public final class BookerContext {

    private static final ThreadLocal<UUID> BOOKER_ID = new ThreadLocal<>();
    private static final ThreadLocal<UUID> BOOKING_ID = new ThreadLocal<>();

    private BookerContext() {
    }

    public static void setBookerId(UUID bookerId) {
        BOOKER_ID.set(bookerId);
    }

    public static UUID getBookerId() {
        return BOOKER_ID.get();
    }

    public static void setBookingId(UUID bookingId) {
        BOOKING_ID.set(bookingId);
    }

    public static UUID getBookingId() {
        return BOOKING_ID.get();
    }

    public static boolean isBooker() {
        return BOOKER_ID.get() != null;
    }

    public static void clear() {
        BOOKER_ID.remove();
        BOOKING_ID.remove();
    }
}
