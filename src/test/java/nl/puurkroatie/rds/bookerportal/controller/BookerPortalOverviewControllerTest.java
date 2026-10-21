package nl.puurkroatie.rds.bookerportal.controller;

import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BookerPortalOverviewControllerTest extends AbstractBookerPortalControllerTest {

    // Boeking BK-2026-001: Dubrovnik 1-8 juli (1400) + Split 8-14 juli (1050) + stadstour (45) = 2495
    @Test
    void booker_getOverview_returnsTheOwnBooking() throws Exception {
        mockMvc.perform(get("/api/booker-portal/overview").header("Authorization", "Bearer " + bookerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.booking.bookingNumber").value(BOOKING_NUMBER))
                .andExpect(jsonPath("$.booking.status").value("aanvraag"))
                .andExpect(jsonPath("$.booking.fromDate").value("2026-07-01"))
                .andExpect(jsonPath("$.booking.untilDate").value("2026-07-14"))
                .andExpect(jsonPath("$.booking.totalSum").value(2495.0))
                .andExpect(jsonPath("$.booker.firstname").value("Klaas"))
                .andExpect(jsonPath("$.travelers", hasSize(2)))
                .andExpect(jsonPath("$.travelers[*].firstname", containsInAnyOrder("Inge", "Daan")));
    }

    @Test
    void booker_getOverview_returnsTheOrganizationAndItsTheme() throws Exception {
        mockMvc.perform(get("/api/booker-portal/overview").header("Authorization", "Bearer " + bookerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.organization.name").value("Puurkroatie"))
                .andExpect(jsonPath("$.organization.primaryColor").value("#1976d2"))
                .andExpect(jsonPath("$.organization.accentColor").value("#ff9800"))
                .andExpect(jsonPath("$.organization.logoUrl").isEmpty());
    }

    // Een externe gebruiker krijgt alleen wat het dashboard nodig heeft: geen ids, auditvelden of gevoelige gegevens
    @Test
    void booker_getOverview_exposesNothingInternal() throws Exception {
        mockMvc.perform(get("/api/booker-portal/overview").header("Authorization", "Bearer " + bookerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.booking.bookingId").doesNotExist())
                .andExpect(jsonPath("$.booking.tenantOrganization").doesNotExist())
                .andExpect(jsonPath("$.booking.createdBy").doesNotExist())
                .andExpect(jsonPath("$.booker.emailaddress").doesNotExist())
                .andExpect(jsonPath("$.booker.telephone").doesNotExist())
                .andExpect(jsonPath("$.booker.lastname").doesNotExist())
                .andExpect(jsonPath("$.travelers[0].lastname").doesNotExist())
                .andExpect(jsonPath("$.travelers[0].birthdate").doesNotExist())
                .andExpect(jsonPath("$.organization.mollieKey").doesNotExist())
                .andExpect(jsonPath("$.organization.emailFrom").doesNotExist())
                .andExpect(jsonPath("$.organization.organizationId").doesNotExist());
    }

    // Medewerker-JWT op het portaal → 403
    @Test
    void employee_getOverview_returns403() throws Exception {
        mockMvc.perform(get("/api/booker-portal/overview").header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isForbidden());
    }

    // Geen JWT → 401
    @Test
    void unauthenticated_getOverview_returns401() throws Exception {
        mockMvc.perform(get("/api/booker-portal/overview"))
                .andExpect(status().isUnauthorized());
    }
}
