package nl.puurkroatie.rds.booking.controller;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AccommodationControllerTest extends AbstractBookingControllerTest {

    // ADMIN: GET /api/accommodations — geen ACCOMMODATION_READ authority → 403
    @Test
    void admin_findAll_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/accommodations")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ADMIN: GET /api/accommodations/{id} — geen ACCOMMODATION_READ authority → 403
    @Test
    void admin_findById_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/accommodations/" + ACCOMMODATION_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // MANAGER: GET /api/accommodations — alleen accommodations van eigen organisatie
    @Test
    void manager_findAll_returnsOnlyOwnOrganizationAccommodations() throws Exception {
        String token = managerToken();

        String response = mockMvc.perform(get("/api/accommodations")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode accommodations = objectMapper.readTree(response);
        for (JsonNode accommodation : accommodations) {
            assert accommodation.get("tenantOrganization").asText().equals(ORG_TECHPARTNER_ID.toString())
                    : "Manager should only see accommodations from own organization";
        }
    }

    // MANAGER: GET /api/accommodations/{id} andere org — 404
    @Test
    void manager_findById_otherOrganization_returns404() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/accommodations/" + ACCOMMODATION_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // MANAGER: POST /api/accommodations — 201
    @Test
    void manager_createAccommodation_returns201() throws Exception {
        String token = managerToken();

        String json = "{\"key\":\"ACC-TEST-001\",\"name\":\"Test Accommodatie\"}";

        mockMvc.perform(post("/api/accommodations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Test Accommodatie"))
                .andExpect(jsonPath("$.tenantOrganization").value(ORG_TECHPARTNER_ID.toString()));
    }

    // MANAGER: PUT /api/accommodations/{id} eigen org — 200
    @Test
    void manager_updateAccommodation_ownOrganization_returns200() throws Exception {
        String token = managerToken();

        String json = "{\"key\":\"ACC-ZAG-001\",\"name\":\"Zagreb Stadsappartement Updated\"}";

        mockMvc.perform(put("/api/accommodations/" + ACCOMMODATION_TP_4)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Zagreb Stadsappartement Updated"));
    }

    // MANAGER: PUT /api/accommodations/{id} andere org — 403
    @Test
    void manager_updateAccommodation_otherOrganization_returns403() throws Exception {
        String token = managerToken();

        String json = "{\"key\":\"ACC-HACK\",\"name\":\"Hacked\"}";

        mockMvc.perform(put("/api/accommodations/" + ACCOMMODATION_PK_1)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // MANAGER: DELETE /api/accommodations/{id} andere org — 403
    @Test
    void manager_deleteAccommodation_otherOrganization_returns403() throws Exception {
        String token = managerToken();

        mockMvc.perform(delete("/api/accommodations/" + ACCOMMODATION_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: GET /api/accommodations — alleen accommodations van eigen organisatie
    @Test
    void employee_findAll_returnsOnlyOwnOrganizationAccommodations() throws Exception {
        String token = employeeToken();

        String response = mockMvc.perform(get("/api/accommodations")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode accommodations = objectMapper.readTree(response);
        for (JsonNode accommodation : accommodations) {
            assert accommodation.get("tenantOrganization").asText().equals(ORG_PUURKROATIE_ID.toString())
                    : "Employee should only see accommodations from own organization";
        }
    }

    // EMPLOYEE: GET /api/accommodations/{id} eigen org — 200
    @Test
    void employee_findById_ownOrganization_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/accommodations/" + ACCOMMODATION_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accommodationId").value(ACCOMMODATION_PK_1.toString()));
    }

    // EMPLOYEE: GET /api/accommodations/{id} andere org — 404
    @Test
    void employee_findById_otherOrganization_returns404() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/accommodations/" + ACCOMMODATION_TP_4)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // EMPLOYEE: POST /api/accommodations — geen ACCOMMODATION_CREATE authority → 403
    @Test
    void employee_createAccommodation_returns403() throws Exception {
        String token = employeeToken();

        String json = "{\"key\":\"ACC-EMP-001\",\"name\":\"Employee Accommodatie\"}";

        mockMvc.perform(post("/api/accommodations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: PUT /api/accommodations/{id} — geen ACCOMMODATION_UPDATE authority → 403
    @Test
    void employee_updateAccommodation_returns403() throws Exception {
        String token = employeeToken();

        String json = "{\"key\":\"ACC-DUB-001\",\"name\":\"Dubrovnik Zeezicht Suite Updated\"}";

        mockMvc.perform(put("/api/accommodations/" + ACCOMMODATION_PK_1)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: PUT /api/accommodations/{id} andere org — 403
    @Test
    void employee_updateAccommodation_otherOrganization_returns403() throws Exception {
        String token = employeeToken();

        String json = "{\"key\":\"ACC-HACK\",\"name\":\"Hacked\"}";

        mockMvc.perform(put("/api/accommodations/" + ACCOMMODATION_TP_4)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: DELETE /api/accommodations/{id} andere org — 403
    @Test
    void employee_deleteAccommodation_otherOrganization_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(delete("/api/accommodations/" + ACCOMMODATION_TP_4)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Ongeauthenticeerd: GET /api/accommodations — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/accommodations"))
                .andExpect(status().isUnauthorized());
    }
}
