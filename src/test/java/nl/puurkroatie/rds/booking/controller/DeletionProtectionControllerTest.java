package nl.puurkroatie.rds.booking.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Documenten en betalingen zijn geschiedenis: een boeking waaraan ze hangen, en alles wat in zo'n boeking
 * voorkomt, mag niet verwijderd worden (anders zou de database ze mee-verwijderen). Een boeking in de seed
 * (BK-2026-004, organisatie TechPartner) heeft een document, een betaling, een boekingsregel en een activiteit.
 */
class DeletionProtectionControllerTest extends AbstractBookingControllerTest {

    private static final java.util.UUID ACTIVITY_TP_4 = java.util.UUID.fromString("0c000000-0000-0000-0000-000000000004");
    private static final java.util.UUID SUPPLIER_OF_BOOKING_4 = SUPPLIER_TP_3;

    private void expectBlocked(String path) throws Exception {
        mockMvc.perform(delete(path).header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("documents or payments")));
    }

    @Test
    void aBookingWithDocumentsAndPayments_cannotBeDeleted_andStillExists() throws Exception {
        expectBlocked("/api/bookings/" + BOOKING_TP_4);

        mockMvc.perform(get("/api/bookings/" + BOOKING_TP_4).header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/documents/" + DOCUMENT_TP_4).header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isOk());
    }

    @Test
    void theBookerOfSuchABooking_cannotBeDeleted() throws Exception {
        expectBlocked("/api/bookers/" + BOOKER_TP_4);
    }

    @Test
    void anAccommodationInSuchABooking_cannotBeDeleted() throws Exception {
        expectBlocked("/api/accommodations/" + ACCOMMODATION_TP_4);
    }

    @Test
    void aSupplierInSuchABooking_cannotBeDeleted() throws Exception {
        expectBlocked("/api/suppliers/" + SUPPLIER_OF_BOOKING_4);
    }

    @Test
    void anActivityInSuchABooking_cannotBeDeleted() throws Exception {
        expectBlocked("/api/activities/" + ACTIVITY_TP_4);
    }

    // ----- wat wél mag: iets zonder gekoppelde geschiedenis -----

    private String create(String path, String idField, String json) throws Exception {
        String body = mockMvc.perform(post(path)
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get(idField).asText();
    }

    @Test
    void aFreshBookingWithoutDocumentsOrPayments_canBeDeleted() throws Exception {
        String id = create("/api/bookings", "bookingId", "{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\",\"bookerId\":\"" + BOOKER_TP_4 + "\"}");

        mockMvc.perform(delete("/api/bookings/" + id).header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isNoContent());
    }

    @Test
    void aFreshBookerAccommodationSupplierAndActivity_canBeDeleted() throws Exception {
        String booker = create("/api/bookers", "bookerId", "{\"firstname\":\"Los\",\"lastname\":\"Booker\",\"emailaddress\":\"los@example.com\"}");
        String accommodation = create("/api/accommodations", "accommodationId", "{\"key\":\"ACC-DEL-1\",\"name\":\"Weg\"}");
        String supplier = create("/api/suppliers", "supplierId", "{\"key\":\"SUP-DEL-1\",\"name\":\"Weg\"}");
        String activity = create("/api/activities", "activityId", "{\"name\":\"Weg\",\"activityType\":\"tour\"}");

        for (String path : new String[]{"/api/bookers/" + booker, "/api/accommodations/" + accommodation,
                "/api/suppliers/" + supplier, "/api/activities/" + activity}) {
            mockMvc.perform(delete(path).header("Authorization", "Bearer " + managerToken()))
                    .andExpect(status().isNoContent());
        }
    }
}
