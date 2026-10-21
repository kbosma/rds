package nl.puurkroatie.rds.bookerportal.controller;

import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BookerPortalPaymentControllerTest extends AbstractBookerPortalControllerTest {

    private static final String PAYMENT_ID = "08000000-0000-0000-0000-000000000001";

    // Betaling 001 van BK-2026-001: 2450,00 EUR via iDEAL, OPEN → PENDING → PAID
    @Test
    void booker_findAll_returnsOwnPaymentWithCurrentStatus() throws Exception {
        mockMvc.perform(get("/api/booker-portal/payments").header("Authorization", "Bearer " + bookerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].molliePaymentId").value(PAYMENT_ID))
                .andExpect(jsonPath("$[0].description").value("Betaling BK-2026-001"))
                .andExpect(jsonPath("$[0].amount").value(2450.0))
                .andExpect(jsonPath("$[0].currency").value("EUR"))
                .andExpect(jsonPath("$[0].method").value("ideal"))
                .andExpect(jsonPath("$[0].currentStatus").value("paid"));
    }

    // De klant krijgt alleen wat nodig is: geen interne ids, auditvelden of Mollie-gegevens
    @Test
    void booker_findAll_exposesNothingInternal() throws Exception {
        mockMvc.perform(get("/api/booker-portal/payments").header("Authorization", "Bearer " + bookerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].createdBy").doesNotExist())
                .andExpect(jsonPath("$[0].modifiedBy").doesNotExist())
                .andExpect(jsonPath("$[0].tenantOrganization").doesNotExist())
                .andExpect(jsonPath("$[0].molliePaymentExternalId").doesNotExist())
                .andExpect(jsonPath("$[0].checkoutUrl").doesNotExist());
    }

    @Test
    void booker_findStatusEntries_returnsOnlyStatusAndTimeInOrderOfRecording() throws Exception {
        mockMvc.perform(get("/api/booker-portal/payments/status-entries")
                        .header("Authorization", "Bearer " + bookerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[*].status", org.hamcrest.Matchers.containsInAnyOrder("open", "pending", "paid")))
                .andExpect(jsonPath("$[*].molliePaymentId", org.hamcrest.Matchers.everyItem(
                        org.hamcrest.Matchers.is(PAYMENT_ID))))
                .andExpect(jsonPath("$[0].createdAt").exists())
                .andExpect(jsonPath("$[0].createdBy").doesNotExist())
                .andExpect(jsonPath("$[0].createdByName").doesNotExist())
                .andExpect(jsonPath("$[0].reason").doesNotExist())
                .andExpect(jsonPath("$[0].correction").doesNotExist());
    }

    // Medewerker-JWT op het portaal → 403
    @Test
    void employee_findAll_returns403() throws Exception {
        mockMvc.perform(get("/api/booker-portal/payments").header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isForbidden());
    }

    // Geen JWT → 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/booker-portal/payments"))
                .andExpect(status().isUnauthorized());
    }
}
