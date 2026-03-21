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

class AddressControllerTest extends AbstractBookingControllerTest {

    // ADMIN: GET /api/addresses — alle adressen over alle organisaties (>= 17)
    @Test
    void admin_findAll_returnsAllAddresses() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/addresses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(17))));
    }

    // ADMIN: GET /api/addresses/{id} — elk adres opvraagbaar
    @Test
    void admin_findById_returnsAnyAddress() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/addresses/" + ADDRESS_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.addressId").value(ADDRESS_PK_1.toString()))
                .andExpect(jsonPath("$.street").value("Kerkstraat"));
    }

    // MANAGER: GET /api/addresses — alleen adressen van eigen organisatie
    @Test
    void manager_findAll_returnsOnlyOwnOrganizationAddresses() throws Exception {
        String token = managerToken();

        String response = mockMvc.perform(get("/api/addresses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode addresses = objectMapper.readTree(response);
        for (JsonNode address : addresses) {
            assert address.get("tenantOrganization").asText().equals(ORG_TECHPARTNER_ID.toString())
                    : "Manager should only see addresses from own organization";
        }
    }

    // MANAGER: GET /api/addresses/{id} andere org — 404
    @Test
    void manager_findById_otherOrganization_returns404() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/addresses/" + ADDRESS_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // MANAGER: POST /api/addresses — 201
    @Test
    void manager_createAddress_returns201() throws Exception {
        String token = managerToken();

        String json = "{\"street\":\"Teststraat\",\"housenumber\":1," +
                "\"housenumberAddition\":null,\"postalcode\":\"1000 AA\"," +
                "\"city\":\"Teststad\",\"country\":\"Nederland\"," +
                "\"addressroleId\":\"" + ADDRESSROLE_WOON + "\"}";

        mockMvc.perform(post("/api/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.street").value("Teststraat"))
                .andExpect(jsonPath("$.tenantOrganization").value(ORG_TECHPARTNER_ID.toString()));
    }

    // MANAGER: PUT /api/addresses/{id} eigen org — 200
    @Test
    void manager_updateAddress_ownOrganization_returns200() throws Exception {
        String token = managerToken();

        String json = "{\"street\":\"Stationsweg Updated\",\"housenumber\":88," +
                "\"housenumberAddition\":null,\"postalcode\":\"3013 AK\"," +
                "\"city\":\"Rotterdam\",\"country\":\"Nederland\"," +
                "\"addressroleId\":\"" + ADDRESSROLE_WOON + "\"}";

        mockMvc.perform(put("/api/addresses/" + ADDRESS_TP_5)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.street").value("Stationsweg Updated"));
    }

    // MANAGER: PUT /api/addresses/{id} andere org — 403
    @Test
    void manager_updateAddress_otherOrganization_returns403() throws Exception {
        String token = managerToken();

        String json = "{\"street\":\"Hack\",\"housenumber\":1," +
                "\"housenumberAddition\":null,\"postalcode\":\"0000\"," +
                "\"city\":\"Hack\",\"country\":\"Hack\"," +
                "\"addressroleId\":\"" + ADDRESSROLE_WOON + "\"}";

        mockMvc.perform(put("/api/addresses/" + ADDRESS_PK_1)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // MANAGER: DELETE /api/addresses/{id} andere org — 403
    @Test
    void manager_deleteAddress_otherOrganization_returns403() throws Exception {
        String token = managerToken();

        mockMvc.perform(delete("/api/addresses/" + ADDRESS_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: GET /api/addresses — alleen adressen van eigen organisatie
    @Test
    void employee_findAll_returnsOnlyOwnOrganizationAddresses() throws Exception {
        String token = employeeToken();

        String response = mockMvc.perform(get("/api/addresses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode addresses = objectMapper.readTree(response);
        for (JsonNode address : addresses) {
            assert address.get("tenantOrganization").asText().equals(ORG_PUURKROATIE_ID.toString())
                    : "Employee should only see addresses from own organization";
        }
    }

    // EMPLOYEE: GET /api/addresses/{id} eigen org — 200
    @Test
    void employee_findById_ownOrganization_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/addresses/" + ADDRESS_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.addressId").value(ADDRESS_PK_1.toString()));
    }

    // EMPLOYEE: GET /api/addresses/{id} andere org — 404
    @Test
    void employee_findById_otherOrganization_returns404() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/addresses/" + ADDRESS_TP_5)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // EMPLOYEE: POST /api/addresses — 201 (heeft BOOKING_WRITE)
    @Test
    void employee_createAddress_returns201() throws Exception {
        String token = employeeToken();

        String json = "{\"street\":\"Empstraat\",\"housenumber\":99," +
                "\"housenumberAddition\":null,\"postalcode\":\"9999 ZZ\"," +
                "\"city\":\"Empstad\",\"country\":\"Nederland\"," +
                "\"addressroleId\":\"" + ADDRESSROLE_WOON + "\"}";

        mockMvc.perform(post("/api/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.street").value("Empstraat"))
                .andExpect(jsonPath("$.tenantOrganization").value(ORG_PUURKROATIE_ID.toString()));
    }

    // EMPLOYEE: PUT /api/addresses/{id} eigen org — 200
    @Test
    void employee_updateAddress_ownOrganization_returns200() throws Exception {
        String token = employeeToken();

        String json = "{\"street\":\"Kerkstraat Updated\",\"housenumber\":12," +
                "\"housenumberAddition\":null,\"postalcode\":\"9711 AB\"," +
                "\"city\":\"Groningen\",\"country\":\"Nederland\"," +
                "\"addressroleId\":\"" + ADDRESSROLE_WOON + "\"}";

        mockMvc.perform(put("/api/addresses/" + ADDRESS_PK_1)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.street").value("Kerkstraat Updated"));
    }

    // EMPLOYEE: PUT /api/addresses/{id} andere org — 403
    @Test
    void employee_updateAddress_otherOrganization_returns403() throws Exception {
        String token = employeeToken();

        String json = "{\"street\":\"Hack\",\"housenumber\":1," +
                "\"housenumberAddition\":null,\"postalcode\":\"0000\"," +
                "\"city\":\"Hack\",\"country\":\"Hack\"," +
                "\"addressroleId\":\"" + ADDRESSROLE_WOON + "\"}";

        mockMvc.perform(put("/api/addresses/" + ADDRESS_TP_5)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: DELETE /api/addresses/{id} andere org — 403
    @Test
    void employee_deleteAddress_otherOrganization_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(delete("/api/addresses/" + ADDRESS_TP_5)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Ongeauthenticeerd: GET /api/addresses — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/addresses"))
                .andExpect(status().isUnauthorized());
    }
}
