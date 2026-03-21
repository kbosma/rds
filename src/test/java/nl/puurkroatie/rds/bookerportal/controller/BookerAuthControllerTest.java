package nl.puurkroatie.rds.bookerportal.controller;

import nl.puurkroatie.rds.bookerportal.entity.Otp;
import nl.puurkroatie.rds.bookerportal.repository.OtpRepository;
import nl.puurkroatie.rds.common.controller.AbstractControllerTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BookerAuthControllerTest extends AbstractControllerTest {

    // Booker klaas@example.com is gekoppeld aan booking BK-2026-001
    private static final String BOOKER_EMAIL = "klaas@example.com";
    private static final String BOOKING_NUMBER = "BK-2026-001";

    @Autowired
    private OtpRepository otpRepository;

    // OTP request met bestaande combinatie emailadres + bookingNumber → 200
    @Test
    void requestOtp_existingCombination_returns200() throws Exception {
        String json = "{\"emailaddress\":\"" + BOOKER_EMAIL + "\",\"bookingNumber\":\"" + BOOKING_NUMBER + "\"}";

        mockMvc.perform(post("/api/booker-auth/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());
    }

    // OTP request met onbekende combinatie → 200 (geen enumeration)
    @Test
    void requestOtp_unknownCombination_returns200() throws Exception {
        String json = "{\"emailaddress\":\"unknown@example.com\",\"bookingNumber\":\"BK-UNKNOWN\"}";

        mockMvc.perform(post("/api/booker-auth/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());
    }

    // OTP verify met juiste code + emailadres + bookingNumber → 200 + token met bookingId
    @Test
    void verifyOtp_correctCode_returns200WithToken() throws Exception {
        // Maak OTP handmatig aan in de database
        Otp otp = new Otp(BOOKER_EMAIL, BOOKING_NUMBER, "123456",
                LocalDateTime.now(), LocalDateTime.now().plusMinutes(10), false);
        otpRepository.save(otp);

        String json = "{\"emailaddress\":\"" + BOOKER_EMAIL + "\",\"bookingNumber\":\"" + BOOKING_NUMBER + "\",\"code\":\"123456\"}";

        mockMvc.perform(post("/api/booker-auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.bookerId").value("02000000-0000-0000-0000-000000000001"))
                .andExpect(jsonPath("$.bookingId").value("01000000-0000-0000-0000-000000000001"));
    }

    // POST /api/booker-auth/verify-otp — foute code → 401
    @Test
    void verifyOtp_wrongCode_returns401() throws Exception {
        String json = "{\"emailaddress\":\"" + BOOKER_EMAIL + "\",\"bookingNumber\":\"" + BOOKING_NUMBER + "\",\"code\":\"999999\"}";

        mockMvc.perform(post("/api/booker-auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isUnauthorized());
    }

    // OTP verify met verlopen code → 401
    @Test
    void verifyOtp_expiredCode_returns401() throws Exception {
        // Maak verlopen OTP aan
        Otp otp = new Otp(BOOKER_EMAIL, BOOKING_NUMBER, "654321",
                LocalDateTime.now().minusMinutes(20), LocalDateTime.now().minusMinutes(10), false);
        otpRepository.save(otp);

        String json = "{\"emailaddress\":\"" + BOOKER_EMAIL + "\",\"bookingNumber\":\"" + BOOKING_NUMBER + "\",\"code\":\"654321\"}";

        mockMvc.perform(post("/api/booker-auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isUnauthorized());
    }
}
