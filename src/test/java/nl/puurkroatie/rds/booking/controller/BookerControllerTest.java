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

class BookerControllerTest extends AbstractBookingControllerTest {

    // ADMIN: GET /api/bookers — alle bookers over alle organisaties (>= 6)
    @Test
    void admin_findAll_returnsAllBookers() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/bookers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(6))));
    }

    // ADMIN: GET /api/bookers/{id} — elke booker opvraagbaar
    @Test
    void admin_findById_returnsAnyBooker() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/bookers/" + BOOKER_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookerId").value(BOOKER_PK_1.toString()))
                .andExpect(jsonPath("$.firstname").value("Klaas"));
    }

    // MANAGER: GET /api/bookers — alleen bookers van eigen organisatie
    @Test
    void manager_findAll_returnsOnlyOwnOrganizationBookers() throws Exception {
        String token = managerToken();

        String response = mockMvc.perform(get("/api/bookers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode bookers = objectMapper.readTree(response);
        for (JsonNode booker : bookers) {
            assert booker.get("tenantOrganization").asText().equals(ORG_TECHPARTNER_ID.toString())
                    : "Manager should only see bookers from own organization";
        }
    }

    // MANAGER: GET /api/bookers/{id} andere org — 404 (service filtert)
    @Test
    void manager_findById_otherOrganization_returns404() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/bookers/" + BOOKER_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // MANAGER: POST /api/bookers — 201
    @Test
    void manager_createBooker_returns201() throws Exception {
        String token = managerToken();

        String json = "{\"bookingId\":\"" + BOOKING_TP_4 + "\"," +
                "\"firstname\":\"Test\",\"prefix\":null,\"lastname\":\"Booker\"," +
                "\"callsign\":\"Tester\",\"telephone\":\"0612345678\"," +
                "\"emailaddress\":\"test@example.com\"," +
                "\"gender\":\"" + GENDER_MAN + "\"," +
                "\"birthdate\":\"1990-01-01\",\"initials\":\"T.\"}";

        mockMvc.perform(post("/api/bookers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.firstname").value("Test"))
                .andExpect(jsonPath("$.tenantOrganization").value(ORG_TECHPARTNER_ID.toString()));
    }

    // MANAGER: DELETE /api/bookers/{id} andere org — 403
    @Test
    void manager_deleteBooker_otherOrganization_returns403() throws Exception {
        String token = managerToken();

        mockMvc.perform(delete("/api/bookers/" + BOOKER_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: GET /api/bookers — alleen bookers van eigen organisatie
    @Test
    void employee_findAll_returnsOnlyOwnOrganizationBookers() throws Exception {
        String token = employeeToken();

        String response = mockMvc.perform(get("/api/bookers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode bookers = objectMapper.readTree(response);
        for (JsonNode booker : bookers) {
            assert booker.get("tenantOrganization").asText().equals(ORG_PUURKROATIE_ID.toString())
                    : "Employee should only see bookers from own organization";
        }
    }

    // EMPLOYEE: GET /api/bookers/{id} eigen org — 200
    @Test
    void employee_findById_ownOrganization_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/bookers/" + BOOKER_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookerId").value(BOOKER_PK_1.toString()));
    }

    // EMPLOYEE: GET /api/bookers/{id} andere org — 404
    @Test
    void employee_findById_otherOrganization_returns404() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/bookers/" + BOOKER_TP_4)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // EMPLOYEE: POST /api/bookers — 201 (heeft BOOKING_WRITE)
    @Test
    void employee_createBooker_returns201() throws Exception {
        String token = employeeToken();

        String json = "{\"bookingId\":\"" + BOOKING_PK_1 + "\"," +
                "\"firstname\":\"Emp\",\"prefix\":null,\"lastname\":\"Booker\"," +
                "\"callsign\":\"Emp\",\"telephone\":\"0699999999\"," +
                "\"emailaddress\":\"emp@example.com\"," +
                "\"gender\":\"" + GENDER_MAN + "\"," +
                "\"birthdate\":\"1995-06-01\",\"initials\":\"E.\"}";

        mockMvc.perform(post("/api/bookers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.firstname").value("Emp"))
                .andExpect(jsonPath("$.tenantOrganization").value(ORG_PUURKROATIE_ID.toString()));
    }

    // EMPLOYEE: DELETE /api/bookers/{id} andere org — 403
    @Test
    void employee_deleteBooker_otherOrganization_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(delete("/api/bookers/" + BOOKER_TP_4)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Ongeauthenticeerd: GET /api/bookers — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/bookers"))
                .andExpect(status().isUnauthorized());
    }
}
