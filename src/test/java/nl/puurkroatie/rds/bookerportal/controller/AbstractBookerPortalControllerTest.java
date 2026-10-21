package nl.puurkroatie.rds.bookerportal.controller;

import com.fasterxml.jackson.databind.JsonNode;
import nl.puurkroatie.rds.bookerportal.entity.Otp;
import nl.puurkroatie.rds.bookerportal.repository.OtpRepository;
import nl.puurkroatie.rds.common.controller.AbstractControllerTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Gedeelde basis voor de portaltests: de boeker Klaas (klaas@example.com) is gekoppeld aan boeking BK-2026-001 van
 * organisatie Puurkroatie. {@link #bookerToken()} doorloopt de OTP-login en geeft het BOOKER-token.
 */
abstract class AbstractBookerPortalControllerTest extends AbstractControllerTest {

    protected static final String BOOKER_EMAIL = "klaas@example.com";
    protected static final String BOOKING_NUMBER = "BK-2026-001";
    protected static final UUID BOOKING_ID = UUID.fromString("01000000-0000-0000-0000-000000000001");

    @Autowired
    private OtpRepository otpRepository;

    protected String bookerToken() throws Exception {
        otpRepository.save(new Otp(BOOKER_EMAIL, BOOKING_NUMBER, "111111",
                LocalDateTime.now(), LocalDateTime.now().plusMinutes(10), false));

        String json = "{\"emailaddress\":\"" + BOOKER_EMAIL + "\",\"bookingNumber\":\"" + BOOKING_NUMBER
                + "\",\"code\":\"111111\"}";
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
}
