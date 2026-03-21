package nl.puurkroatie.rds.bookerportal.controller;

import com.fasterxml.jackson.databind.JsonNode;
import nl.puurkroatie.rds.bookerportal.entity.Otp;
import nl.puurkroatie.rds.bookerportal.repository.OtpRepository;
import nl.puurkroatie.rds.common.controller.AbstractControllerTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BookerPortalDocumentControllerTest extends AbstractControllerTest {

    // Booker klaas@example.com is gekoppeld aan booking BK-2026-001 (heeft 1 document: 07000000-...-001)
    private static final String BOOKER_EMAIL = "klaas@example.com";
    private static final String BOOKING_NUMBER = "BK-2026-001";
    private static final UUID DOCUMENT_ID = UUID.fromString("07000000-0000-0000-0000-000000000001");
    private static final UUID DOCUMENT_OTHER = UUID.fromString("07000000-0000-0000-0000-000000000002");

    @Autowired
    private OtpRepository otpRepository;

    private String bookerToken() throws Exception {
        // Maak OTP aan en verifieer om een token te krijgen
        Otp otp = new Otp(BOOKER_EMAIL, BOOKING_NUMBER, "111111",
                LocalDateTime.now(), LocalDateTime.now().plusMinutes(10), false);
        otpRepository.save(otp);

        String json = "{\"emailaddress\":\"" + BOOKER_EMAIL + "\",\"bookingNumber\":\"" + BOOKING_NUMBER + "\",\"code\":\"111111\"}";

        String response = mockMvc.perform(post("/api/booker-auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode responseJson = objectMapper.readTree(response);
        return responseJson.get("token").asText();
    }

    // Booker ziet documenten van de specifieke boeking → 200
    @Test
    void booker_findAll_returnsDocumentsForBooking() throws Exception {
        String token = bookerToken();

        mockMvc.perform(get("/api/booker-portal/documents")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].documentId").value(DOCUMENT_ID.toString()));
    }

    // Booker ziet specifiek document van eigen boeking → 200
    @Test
    void booker_findById_ownBookingDocument_returns200() throws Exception {
        String token = bookerToken();

        mockMvc.perform(get("/api/booker-portal/documents/" + DOCUMENT_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentId").value(DOCUMENT_ID.toString()));
    }

    // Booker ziet geen documenten van andere boeking → 404
    @Test
    void booker_findById_otherBookingDocument_returns404() throws Exception {
        String token = bookerToken();

        mockMvc.perform(get("/api/booker-portal/documents/" + DOCUMENT_OTHER)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // Medewerker-JWT op booker-portal → 403
    @Test
    void employee_accessBookerPortal_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/booker-portal/documents")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Geen JWT → 401
    @Test
    void unauthenticated_accessBookerPortal_returns401() throws Exception {
        mockMvc.perform(get("/api/booker-portal/documents"))
                .andExpect(status().isUnauthorized());
    }
}
