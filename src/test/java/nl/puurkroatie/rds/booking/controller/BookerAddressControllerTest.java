package nl.puurkroatie.rds.booking.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BookerAddressControllerTest extends AbstractBookingControllerTest {

    // ADMIN: GET /api/booker-addresses — geen BOOKING_READ authority → 403
    @Test
    void admin_findAll_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/booker-addresses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ADMIN: GET /api/booker-addresses/{bookerId}/{addressId} — geen BOOKING_READ authority → 403
    @Test
    void admin_findById_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/booker-addresses/" + BOOKER_PK_1 + "/" + ADDRESS_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // MANAGER: GET /api/booker-addresses — 200 (heeft BOOKING_READ)
    @Test
    void manager_findAll_returns200() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/booker-addresses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    // MANAGER: GET /api/booker-addresses/{bookerId}/{addressId} eigen org — 200
    @Test
    void manager_findById_ownOrganization_returns200() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/booker-addresses/" + BOOKER_TP_4 + "/" + ADDRESS_TP_5)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookerId").value(BOOKER_TP_4.toString()));
    }

    // MANAGER: GET /api/booker-addresses/{bookerId}/{addressId} andere org — 404 (service filtert op tenant)
    @Test
    void manager_findById_otherOrganization_returns404() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/booker-addresses/" + BOOKER_PK_1 + "/" + ADDRESS_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // MANAGER: POST /api/booker-addresses — 201 (heeft BOOKING_WRITE, koppeling binnen eigen org)
    @Test
    void manager_createBookerAddress_returns201() throws Exception {
        String token = managerToken();

        // Koppel TechPartner booker 4 aan TechPartner address 11 (accommodatie-adres)
        String json = "{\"bookerId\":\"" + BOOKER_TP_4 + "\",\"addressId\":\"" + ADDRESS_TP_11 + "\"}";

        mockMvc.perform(post("/api/booker-addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated());
    }

    // MANAGER: DELETE /api/booker-addresses/{bookerId}/{addressId} eigen org — 204
    @Test
    void manager_deleteBookerAddress_ownOrganization_returns204() throws Exception {
        String token = managerToken();

        mockMvc.perform(delete("/api/booker-addresses/" + BOOKER_TP_4 + "/" + ADDRESS_TP_5)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    // EMPLOYEE: GET /api/booker-addresses — 200 (heeft BOOKING_READ)
    @Test
    void employee_findAll_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/booker-addresses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    // EMPLOYEE: GET /api/booker-addresses/{bookerId}/{addressId} eigen org — 200
    @Test
    void employee_findById_ownOrganization_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/booker-addresses/" + BOOKER_PK_1 + "/" + ADDRESS_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookerId").value(BOOKER_PK_1.toString()));
    }

    // EMPLOYEE: GET /api/booker-addresses/{bookerId}/{addressId} andere org — 404 (service filtert op tenant)
    @Test
    void employee_findById_otherOrganization_returns404() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/booker-addresses/" + BOOKER_TP_4 + "/" + ADDRESS_TP_5)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // EMPLOYEE: POST /api/booker-addresses — 201 (heeft BOOKING_WRITE, koppeling binnen eigen org)
    @Test
    void employee_createBookerAddress_returns201() throws Exception {
        String token = employeeToken();

        // Koppel Puurkroatie booker 1 aan Puurkroatie address 8 (accommodatie-adres)
        String json = "{\"bookerId\":\"" + BOOKER_PK_1 + "\",\"addressId\":\"" + ADDRESS_PK_8 + "\"}";

        mockMvc.perform(post("/api/booker-addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated());
    }

    // EMPLOYEE: DELETE /api/booker-addresses/{bookerId}/{addressId} eigen org — 204
    @Test
    void employee_deleteBookerAddress_ownOrganization_returns204() throws Exception {
        String token = employeeToken();

        mockMvc.perform(delete("/api/booker-addresses/" + BOOKER_PK_1 + "/" + ADDRESS_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    // Ongeauthenticeerd: GET /api/booker-addresses — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/booker-addresses"))
                .andExpect(status().isUnauthorized());
    }
}
